# Copyright 2024 Proyectos y Sistemas de Mantenimiento SL (eProsima).
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import math
import numpy as np
import os

import aml
from aml.aml_fast.amlFastBitarrays import bitarray

from process_aml_model_results import create_atom_from_json, load_model

from load_and_preprocess_datasets import imagesGenerator

def digitToConstants(d, size):
    """
    This function converts an image to a set of constants.
    The function is dataset dependent and should be customized for each dataset.
    :param d: The image
    :param size: The size of the image
    :return: A set of constants
    """
    ss = size * size
    j = 0
    threshold = 256 / 100 # define one or several thresholds
    ret = [-1] * size * size # Initialize an array to store the constants
    for x in range(size):
        for y in range(size):
            # Create custom constants according to the dataset
            if d[j] > 128:  # Check if the pixel value is above the threshold
                ret[j] = j  
            elif d[j] > 64:
                ret[j] = j + ss
            elif d[j] > 32:
                ret[j] = j + 2 * ss
            elif d[j] > 16:
                ret[j] = j + 3 * ss
            elif d[j] > 8:
                ret[j] = j + 4 * ss
            elif d[j] > 4:
                ret[j] = j + 5 * ss
            else:
                ret[j] = j + 6 * ss
            j += 1
    result = set(ret) # Convert the array to a set
    return result

def mnistDigit(targetDigit, size, loader):
    """
    Produces embedded images from the target class, to create positive duples.
    :param targetDigit: The target class.
    :param size: The size of the images.
    :return: A set of embeddings.
    """
    # d: image, label: label, i: index
    # The complement parameter is set to False to get the target class
    d, label, i = loader.get_next_digit_unpacked(targetDigit, complement = False)
    result = digitToConstants(d, size)
    return aml.amlset(result)

def mnistOtherDigit(targetDigit, size, loader):
    """
    Produces embedded images from the rest of the classes, to create negative duples.
    :param targetDigit: The target class.
    :param size: The size of the images.
    :return: A set of embeddings.
    """
    # d: image, label: label, i: index
    # The complement parameter is set to True to get the rest of the classes
    d, label, i = loader.get_next_digit_unpacked(targetDigit, complement = True)
    result = digitToConstants(d, size)
    return aml.amlset(result)

def train_alma(model_type ,images, labels, target_digit=0, iterations=10, batch_size=100, uploaded_atomization=False):
    """
    This function trains an Alma binary classifier using the given dataset.
    :param images: The images in the dataset.
    :param labels: The labels in the dataset.
    :param target_digit: The target class to classify.
    :param size: The size of the images in the dataset.
    :param iterations: The number of iterations to train the model.
    :param batch_size: The batch size for the positive class.
    :return: A string indicating that the training has been completed. Can be customized.

    """
    # Training iterations
    iterations = iterations # Maximum number of mini-batch iterations

    # Initialize the images generator
    dataset_loader = imagesGenerator(images, labels)

    gridSideLength = int(math.sqrt(len(images[0])))  # side of images in the dataset
    embedding_constants = {*range(0, 2 * gridSideLength * gridSideLength*6)}
    targetDigit = target_digit  # 0 ... 9

    balance = 9
    pBatchSize = batch_size # batch size for the target class (positive examples)
    nBatchSize =batch_size * balance # batch size for the rest of the classes (negative examples)

    model = aml.Model()
    for i in embedding_constants:
        c = model.cmanager.setNewConstantIndex()

    vIndex = model.cmanager.setNewConstantIndexWithName("v")
    vTerm = aml.amlset([vIndex])

    # Initialize batch training
    batchLearner = aml.sparse_crossing_embedder(model)
    batchLearner.params.useReduceIndicators = True
    batchLearner.params.byQuotient = False
    batchLearner.params.staticConstants = True

    if uploaded_atomization:
        # Load the atomization
        file_name = (os.listdir(f"files_uploaded/")[0]).split('.')[0]
        batchLearner.lastUnionModel = load_model(f"files_uploaded/{file_name}")


    cOrange = "\u001b[33m"
    cGreen = "\u001b[36m"
    cReset = "\u001b[0m"

    # Start training
    for i in range(iterations):
        # Here we can add heuristics for the minibatch size

        # Generate and embed examples
        print("<Generating training set", end="", flush=True)
        nbatch = []
        for e in range(int(nBatchSize)):
            counterExampleTerm = mnistOtherDigit(targetDigit, gridSideLength, dataset_loader)

            is_positive_duple = False
            generation = model.generation
            region = 1

            nRel = aml.Duple(vTerm, counterExampleTerm, is_positive_duple, generation, region)  # fmt:skip
            nbatch.append(nRel)

        pbatch = []
        for e in range(int(pBatchSize)):
            exampleTerm = mnistDigit(targetDigit, gridSideLength, dataset_loader)

            is_positive_duple = True
            generation = model.generation
            region = 1

            pRel = aml.Duple(vTerm, exampleTerm, is_positive_duple, generation, region)
            pbatch.append(pRel)
        # Training function.
        # It is somewhat parallel to one backpropagation step, but instead of modifying weight
        #   it
        batchLearner.enforce(pbatch, nbatch)

        print(
            f"{cOrange}BATCH#:{cReset}",
            f"{cOrange}{i}{cReset}",
            "batchSize(",
            int(pBatchSize),
            ",",
            int(nBatchSize),
            "             ------------- master: ",
            "model size",
            len(batchLearner.unionModel),
        )

    if not os.path.exists(f"RESULTS/{model_type}"):
        os.makedirs(f"RESULTS/{model_type}")

    aml.saveAtomizationOnFileUsingBitarrays(
        batchLearner.lastUnionModel,
        model.cmanager,
        f"RESULTS/{model_type}/{model_type}_{targetDigit}",
    )

    print(f"{cGreen}Union model size:{cReset} {len(batchLearner.unionModel)}")
    print(f"{cGreen}Size spectrum:{cReset}")
    aml.printLSpectrum(batchLearner.unionModel)

    print(f"{cGreen}Some random atoms:{cReset}")
    import random
    for at in random.choices(model.atomization, k=10):
        print(at.ucs)

    batchLearner.unionModel.sort(reverse=True,key=lambda at: len(at.ucs))
    print(f"{cGreen}Largest atom{cReset}")
    print(batchLearner.unionModel[0].ucs)
    return model.cmanager, batchLearner.lastUnionModel

def load_aml_structures(constant_manager, lst_atoms, model_name):
    """
    This function loads the atomization structures into a JSON file.
    :param constant_manager: The constant manager.
    :param lst_atoms: The list of atoms.
    :param model_name: The name of the model.
    :return: json_dict: The JSON dictionary containing the atomization structures.
    """

    json_dict = {}
    map_name_to_const = {}
    json_dict['model_name'] = model_name
    json_dict['model_size'] = lst_atoms.__sizeof__()
    for k, v in constant_manager.getReversedNameDictionary().items():
        map_name_to_const[v] = int(k)
        json_dict['vTerm'] = list(map_name_to_const.values())

    for int_const in constant_manager.embeddingConstants:
        list_atomization = []
        if int_const in map_name_to_const.values():
            for atom in lst_atoms:
                map_atomization = {}
                if int_const in atom.ucs:
                    bitarray_atom_to_list = list(atom.ucs)
                    atom_epoch = atom.epoch
                    print('atom_epoch:',atom_epoch)
                    atom_gen = atom.gen
                    map_atomization['atom_epoch'] = atom_epoch
                    map_atomization['atom_gen'] = atom_gen
                    map_atomization['atom_ucs'] = bitarray_atom_to_list
                    list_atomization.append(map_atomization)
            json_dict[int_const] = list_atomization
    return json_dict

def train_binary_classifier(model, images, labels, target_digit=0, iterations=10, batch_size=100, uploaded_atomization=False):
    """
    This function trains an Alma binary classifier using the given dataset.
    :param images: The images in the dataset.
    :param labels: The labels in the dataset.
    :param target_digit: The target class to classify.
    :param size: The size of the images in the dataset.
    :param iterations: The number of iterations to train the model.
    :param batch_size: The batch size for the positive class.
    :return: A string indicating that the training has been completed. Can be customized.

    """
    cmanager, lst_atoms = train_alma(model, images, labels, target_digit, iterations, batch_size, uploaded_atomization)
    atomization_dict = load_aml_structures(cmanager, lst_atoms, model)
    return atomization_dict

def calculate_misses(training_set, json_file, target_digit='positive'):
    """
    This function calculates the misses for the positive and negative examples in the dataset.
    :param training_set: The training set.
    :param json_file: The JSON file containing the atomization.
    :param target_digit: The target class to classify.
    :return: model_predict: Function that returns the probability of an image belonging to a certain class.
    """
    training_set = json.loads(training_set)
    json_model = json.loads(json_file)
    dataset = training_set['data']
    
    test_images = [image['x'] for image in dataset]
    test_labels = [label['y'] for label in dataset]

    targetDigit=target_digit
    gridSideLength=int(math.sqrt(len(test_images[0])))

    atoms = create_atom_from_json(json_file)
    vTerm = bitarray(json_model['vTerm'][0])

    def computeMisses(leftTerm, rightTerm, atomization):
        atomsInLeftTerm = aml.atomsIn(atomization, leftTerm)
        atomsMissingInRight = aml.atomsNotIn(atomsInLeftTerm, rightTerm)
        return atomsMissingInRight

    test_loader = imagesGenerator(test_images, test_labels)
    positiveExampleTerm = [mnistDigit(targetDigit, gridSideLength, test_loader) for _ in range(len(dataset))]
    negativeExampleTerm = [mnistOtherDigit(targetDigit, gridSideLength, test_loader) for _ in range(len(dataset))]
    missesPositiveExamples = [computeMisses(vTerm, ex, atoms) for ex in positiveExampleTerm]
    missesNegativeExamples = [computeMisses(vTerm, ex, atoms) for ex in negativeExampleTerm]
    misses={}
    misses['positive'] = [len(misses) for misses in missesPositiveExamples]
    misses['negative'] = [len(misses) for misses in missesNegativeExamples]
    print("Misses:" , misses)

    def image_missing_atoms(image, size=gridSideLength):
        """
        This function calculates the misses for an image.
        :param image: The image.
        :param size: The size of the image.
        :return: misses_image: The misses for the image.
        """
        example = aml.amlset(digitToConstants(image, size))
        misses_example =[computeMisses(vTerm, example, atoms)]
        misses_image = [len(miss) for miss in misses_example]
        return misses_image

    def model_predict(predict_image, size=gridSideLength):
        """
        This function predicts the probability of an image belonging to a certain class.
        :param predict_image: The image to predict.
        :param target_digit: The target class.
        :param size: The size of the image.
        :return: dict_confidences: The dictionary containing the confidences of the prediction.
        """

        image_misses = image_missing_atoms(predict_image, size=size)
        class_misses = {}
        total_misses = 0
        means=[]
        for cl in misses.keys():
            misses_per_class=0
            for miss in misses[cl]:
                misses_per_class+=miss
            means.append(np.mean(misses[cl]))
            total_misses+=misses_per_class
            class_misses[cl] = misses_per_class

        mean_total = np.mean(means)
        for miss in image_misses:
            dict_confidences = {}
            confidences={}
            if miss < mean_total:
                dict_confidences['label'] = 'positive'
                p_miss = miss/total_misses
                confidences['positive'] = 1 - p_miss
                confidences['negative'] = p_miss
                dict_confidences['confidences'] = confidences
            else:
                dict_confidences['label'] = 'negative'
                p_miss = miss/total_misses
                confidences['positive'] = p_miss
                confidences['negative'] = 1-p_miss
                dict_confidences['confidences'] = confidences

        return dict_confidences
    return model_predict
