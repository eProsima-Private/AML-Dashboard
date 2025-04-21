import random
import sys
import json
import os

import aml

from process_aml_model_results import load_model, create_atom_from_json

from aml.aml_fast.amlFastBitarrays import bitarray
from aml.amldl import (
    load_embedding,
    F,
)

RANSEED = 522060

# MAX_ITER = 40#500000000000
SAVE_EVERY = 5

#%%

cOrange = "\u001b[33m"
cGreen = "\u001b[36m"
cReset = "\u001b[0m"

def load_aml_structures(constant_manager, lst_atoms, o):
    map_name_to_const = {}
    for k, v in constant_manager.getReversedNameDictionary().items():
        # 803 Black[19]
        map_name_to_const[v] = int(k)


    set_relevant = { map_name_to_const['O['+str(o)+']'] }
    map_const_to_atoms = {}
    for int_const in constant_manager.embeddingConstants:
        # We do not really use others in other places..
        if int_const not in set_relevant:
            continue
        lst_atoms_in_const = []
        for atom in lst_atoms:
            if int_const in atom.ucs:
                lst_atoms_in_const.append(atom)
        map_const_to_atoms[int_const] = lst_atoms_in_const
    print(len(map_const_to_atoms))
    return map_const_to_atoms, map_name_to_const

def build_const_map(arr_feat_range, map_nm_to_const):
    # lst_res[f][v] should give the constant for feature f with value v.
    lst_res = [ [None]*r for r in arr_feat_range]
    for f in range(len(lst_res)):
        sensors_variable_range = int(arr_feat_range[f])
        for v in range(len(lst_res[f])):
            sensor, sensorReading = f, v
            if sensorReading == 0:
                const_nm = f"LE{sensor}[{sensorReading}]"
            elif sensorReading == sensors_variable_range - 1:
                const_nm = f"G{sensor}[{sensorReading}]"
            else:
                const_nm = f"LE{sensor}[{sensorReading}]"
            lst_res[f][v] = map_nm_to_const[const_nm]
    return lst_res

class ModelConverter():
    def __init__(self, cmanager, lst_atoms, o) -> None:
        self.constant_manager = cmanager
        self.lst_atoms = lst_atoms

        self.map_const_to_atoms, self.map_name_to_const = \
            load_aml_structures(self.constant_manager, self.lst_atoms, o)

        self.o = o
        self.o_class = self.map_name_to_const['O['+str(o)+']']
        self.atoms_o_class = self.map_const_to_atoms[self.o_class]

    def get_const_map(self, arr_feat_range):
        return build_const_map(arr_feat_range, self.map_name_to_const)

    def get_atoms_relevant(self):
        lst_atoms = []
        for atom in self.atoms_o_class:
            lst_atoms.append( list(atom.ucs) )
        return lst_atoms

class trainingParameters:
    def __init__(self):
        self.numberOfConstants = 0
        self.balance = 1  # Either 1 or 9 is how many times false positives are overvalued over false negatives
        self.initialPTrainingExamples = 0
        self.initialNTrainingExamples = 0
        self.maxPTrainingExamples = 0
        self.maxNTrainingExamples = 0
        self.sizeOfQuickTest = 0
        self.sizeOfFullTest = 0
        self.usePositiveValidationFilter = False

def getExamples(examples, k):
    p = random.sample(examples, k=int(k))
    res = [(bitarray(ex.rl_L.s), bitarray(ex.rl_H.s), ex.region) for ex in p]
    return res

class batchHandler:
    def __init__(
        self, batchLearner, initalpSize, maxpSize, initalnSize, maxnSize, balance
    ):
        self.batchLearner = batchLearner
        self.pBatchSize = initalpSize
        self.maxpSize = maxpSize
        self.nBatchSize = initalnSize
        self.maxnSize = maxnSize
        self.balance = balance
        self.bestAverage = 1
        self.maxSizeOfReserve = len(self.batchLearner.unionModel)
        self.extendedPositives = 0
        self.stored = []

    def getBatchSizes(self):
        average = (self.balance * self.batchLearner.vars.FPR + self.batchLearner.vars.FNR) / (
            1 + self.balance
        )
        sizeOfReserve = len(self.batchLearner.unionModel)

        if sizeOfReserve > self.maxSizeOfReserve:
            self.pBatchSize = min(1.02 * self.pBatchSize, self.maxpSize)
            if self.batchLearner.vars.FNR < self.balance * self.batchLearner.vars.FPR:
                self.nBatchSize = min(1.02 * self.nBatchSize, self.maxnSize)
                self.extendedPositives = 0.98 * self.extendedPositives
        else:
            if sizeOfReserve != self.maxSizeOfReserve:
                self.pBatchSize = max(0.98 * self.pBatchSize, 1)
            self.extendedPositives += 0.02 * (self.pBatchSize + self.extendedPositives)

        self.maxSizeOfReserve = max(self.maxSizeOfReserve, sizeOfReserve)
        self.bestAverage = min(self.bestAverage, average)

        return self.pBatchSize, self.nBatchSize

    def enforce(self, pbatch, nbatch):
        alg = self.batchLearner.model

        print("<Select for storing...", end="", flush=True)
        target = alg.atomization
        las = aml.calculateLowerAtomicSegment(
            target, alg.cmanager.embeddingConstants, True
        )
        trainSpace = aml.termSpace()
        for rel in pbatch:
            if rel.region != 0:
                rel.wL = trainSpace.add(rel.L)
                rel.wH = trainSpace.add(rel.R)
        trainSpace.calculateLowerAtomicSegments(target, las)
        tostore = []
        for rel in pbatch:
            if rel.region != 0:
                disc = rel.wL.las - rel.wH.las
                if disc:
                    tostore.append(rel)
            rel.wH = None
            rel.wL = None
        print(len(tostore), ">")

        pbatchExtended = pbatch.copy()
        pbatchExtended.extend(self.stored)

        self.batchLearner.enforce(pbatchExtended, nbatch)

        tostore.extend(self.stored)
        self.stored = tostore[: int(self.extendedPositives)]
        print("Stored positive relations:", len(self.stored))

def batchLearning(
    batchLearner,
    alg,
    examples,
    counterExamples,
    params,
    args_params,
    uploaded_atomization = False
):
    cOrange = "\u001b[33m"
    cGreen = "\u001b[36m"
    cReset = "\u001b[0m"

    for i in range(params.numberOfConstants):
        c = alg.cmanager.setNewConstantIndex()

    testResult = "none"
    testResultOnReserve = "none"

    balance = params.balance
    pBatchSize = min(params.initialPTrainingExamples, len(examples[1]))
    nBatchSize = min(params.initialNTrainingExamples * balance, len(counterExamples[1]))
    maxValP = min(params.maxPTrainingExamples, len(examples[1]))
    maxValN = min(params.maxNTrainingExamples, len(counterExamples[1]))

    bHandler = batchHandler(
        batchLearner, pBatchSize, maxValP, nBatchSize, maxValN, balance
    )
    
    if uploaded_atomization:
        # Load the atomization
        file_name = (os.listdir(f"files_uploaded/")[0]).split('.')[0]
        batchLearner.lastUnionModel = load_model(f"files_uploaded/{file_name}")

        
    for i in range(params.n_iter_max):
        pBatchSize, nBatchSize = bHandler.getBatchSizes()

        print("<Generating training set", end="", flush=True)
        nbatch = []
        ex = [
            (bitarray(e.rl_L.s), bitarray(e.rl_H.s), e.region)
            for e in counterExamples[0]
        ]
        ex += getExamples(counterExamples[1], nBatchSize)
        for L, H, region in ex:
            nRel = aml.Duple(L, H, positive=False, generation=alg.generation, region=region)
            nbatch.append(nRel)

        pbatch = []
        ex = [(bitarray(e.rl_L.s), bitarray(e.rl_H.s), e.region) for e in examples[0]]
        ex += getExamples(examples[1], pBatchSize)
        for L, H, region in ex:
            pRel = aml.Duple(L, H, positive=True, generation=alg.generation, region=region)
            pbatch.append(pRel)
        print(">")

        bHandler.enforce(pbatch, nbatch)
        print(f"{cGreen}bestAverage{cReset}", bHandler.bestAverage)

        import gc
        gc.collect()

        region = 3

        if i % SAVE_EVERY == 0:
            path_save_i = args_params["path_save_model"]
            aml.saveAtomizationOnFileUsingBitarrays(
                batchLearner.lastUnionModel,
                batchLearner.model.cmanager,
                f"{path_save_i}/sensors_{i}_{os.getpid()}",
            )

        print(
            f"{cOrange}BATCH#:{cReset}",
            f"{cOrange}{i}{cReset}",
            "seen (",
            batchLearner.vars.pcount,
            ",",
            batchLearner.vars.ncount,
            ")  EPOCH:",
            alg.epoch,
            "batchSize(",
            int(pBatchSize),
            ",",
            int(nBatchSize),
            ")  Generation:",
            alg.generation,
            "             ---------------------",
            testResult,
            "   reserve",
            # strReportError,
            "   reserve size",
            len(batchLearner.unionModel),
        )

    print()
    print()
    return batchLearner.model.cmanager, batchLearner.lastUnionModel

# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
def train_class(out_class, n_classes, path_save_model, X_train, y_train, X_test, y_test, arr_feat_range, n_iter_max, uploaded_atomization = False):
    random.seed(RANSEED)
    sys.setrecursionlimit(100000000)

    alg = aml.Model()

    # This can be read from the input file
    params = dict()
    params['out_class'] = out_class
    params["path_save_model"] = path_save_model
    params["n_classes"] = n_classes

    params['data_train'] = (X_train, y_train)
    params['data_test'] = (X_test, y_test)

    params['arr_feat_range'] = arr_feat_range

    # Make sure we have a place to save our resuts.
    if not os.path.exists(params["path_save_model"]):
        os.makedirs(params["path_save_model"])

    print("<Loading embedding>")
    DESC = load_embedding("gesture_embedding.py", params)

    with DESC as theEmbedding:
        constantNames = [el.key for el in F("constants pending transfer to algebra").r]

        for name in constantNames:
            alg.cmanager.setNewConstantIndexWithName(
                name)

        p = F("inclusions").r
        n = F("exclusions").r

        p_structure = []
        p_examples = []
        n_structure = []
        n_examples = []
        p_test = []
        n_test = []
        for r in p:
            if r.region == 0:
                p_structure.append(r)
            elif r.region == 1:
                p_examples.append(r)
            elif r.region == 3:
                p_test.append(r)
            else:
                raise IndexError(f"Wrong region p:{r.region}")
        for r in n:
            if r.region == 0:
                n_structure.append(r)
            elif r.region == 1:
                n_examples.append(r)
            elif r.region == 3:
                n_test.append(r)
            else:
                raise IndexError(f"Wrong region n:{r.region}")

        p = (p_structure, p_examples, p_test)
        n = (n_structure, n_examples, n_test)

    print("----------------------------------------------------------------------")
    print("----------------------------------------------------------------------")
    print("----------------------------------------------------------------------")
    print("----------------------------------------------------------------------")
    print("----------------------------------------------------------------------")
    print("----------------------------------------------------------------------")
    print("----------------------------------------------------------------------")
    print("----------------------------------------------------------------------")

    args_params = params

    batchLearner = aml.sparse_crossing_embedder(alg)

    params = trainingParameters()
    params.balance = 1
    params.initialPTrainingExamples = 50
    params.initialNTrainingExamples = 100
    params.maxPTrainingExamples = 200
    params.maxNTrainingExamples = 1000
    params.sizeOfQuickTest = 200
    params.sizeOfFullTest = 1000
    params.usePositiveValidationFilter = False
    params.n_iter_max = n_iter_max

    useReduceIndicators = True
    byQuotient = False
    params.numberOfConstants = len(constantNames)

    batchLearner.params.useReduceIndicators = useReduceIndicators
    batchLearner.params.enforceTraceConstraints = True
    batchLearner.params.byQuotient = byQuotient
    batchLearner.params.storePositives = False

    res = batchLearning(
        batchLearner,
        alg,
        p,
        n,
        params,
        args_params,
        uploaded_atomization
    )
    return res
