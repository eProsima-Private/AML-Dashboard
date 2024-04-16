import random
import numpy as np
from tqdm import tqdm
import os
from aml_engine.amldl import (
    ADD,
    APP,
    C,
    CV,
    CMP,
    Descriptor,
    EXC,
    F,
    HEADER,
    INC,
    M,
    R,
    SOME,
    T,
    V,
    S,
)


from sklearn.preprocessing import KBinsDiscretizer
from astropy.stats import bayesian_blocks

_i = 1


def MM(A, B):
    if A == None:
        return B
    else:
        return M(A, B)
    

def learn_prep_knn(X_train, X_test, n_bins=64, random_state=32):
    prep = KBinsDiscretizer(n_bins=n_bins, encode = 'ordinal',random_state=32)
    X_train_prep = prep.fit_transform(X_train)
    X_test_prep = prep.transform(X_test)
    
    arr_feat_range = np.array([n_bins] * X_train_prep.shape[1])
    return X_train_prep, X_test_prep, arr_feat_range, prep.bin_edges_

def learn_prep_bayes(X_train, X_test):
    arr_feat_range = []
    X_train_prep = np.zeros(X_train.shape)
    X_test_prep = np.zeros(X_test.shape)
    
    lst_edges = []
    for col in range(X_train.shape[1]):
        edges = bayesian_blocks(X_train[:,col])
        lst_edges.append(edges)
    
    for col in range(X_train.shape[1]):
        edges = lst_edges[col]
        arr_feat_range.append(len(edges) + 1)
        print("col", col, "size", len(edges))

        X_train_prep[:, col] = np.digitize(X_train[:, col], edges, right=True)
        X_test_prep[:, col] = np.digitize(X_test[:, col], edges, right=True)
    arr_feat_range = np.array(arr_feat_range)
    return X_train_prep, X_test_prep, arr_feat_range, lst_edges

def embedding(params):
    out_cls = int(params['out_class'])
    X_train, y_train = params['data_train']
    X_test, y_test = params['data_test']
    n_classes =  params['n_classes']
    arr_feat_range = params['arr_feat_range']

    # if prep == 'bayes':
    #     X_train, X_test, arr_feat_range, edges = learn_prep_bayes(X_train, X_test)
    # elif prep == 'kmeans':
    #     X_train, X_test, arr_feat_range, edges = learn_prep_knn(X_train, X_test)
    
    lst_ordered_classes = list(range(n_classes))
    outputValueTested = out_cls

    X_val, y_val = X_test, y_test
    DESC = Descriptor()
    with DESC as theEmbedding:
        if HEADER("Sensors"):
            for feat_i in range(len(arr_feat_range)):
                n_clusters_for_feat = arr_feat_range[feat_i]
                
                if n_clusters_for_feat > 1:
                    CV(f"LE{feat_i}", n_clusters_for_feat)
                    CV(f"G{feat_i}",  n_clusters_for_feat)
                    CMP(f"LE{feat_i}", f"G{feat_i}")

        if HEADER("Outputs"):
            CV("O", len(lst_ordered_classes))

        theEmbedding.REGION = 0
        for feat_i in range(len(arr_feat_range)):
            for vi in range(arr_feat_range[feat_i] - 2):
                INC(F(f"LE{feat_i}", vi+1), F(f"LE{feat_i}", vi))
                INC(F(f"G{feat_i}", vi), F(f"LE{feat_i}", vi+1))

        # Read training data
        print("Loading training examples")
        for x, label in tqdm(zip(X_train, y_train), total=len(X_train)):
            aux = None
            for feat_i in range(len(arr_feat_range)):
                sensors_variable_range = int(arr_feat_range[feat_i])
                if sensors_variable_range < 2:
                    continue
                
                sensorReading = int(x[feat_i])
                
                if sensorReading > sensors_variable_range - 1:
                    print(f"f{feat_i} r{sensorReading} m{sensors_variable_range - 1}")
                    raise IndexError(f"Sensor reading out of range")

                if sensorReading == 0:
                    aux = MM(aux, F(f"LE{feat_i}", sensorReading))
                elif sensorReading == sensors_variable_range - 1:
                    aux = MM(aux, F(f"G{feat_i}", sensorReading-1))
                else:
                    aux = MM(aux, F(f"LE{feat_i}", sensorReading))
                    aux = MM(aux, F(f"G{feat_i}", sensorReading-1))
            theEmbedding.REGION = 1
            if label == outputValueTested:
                ADD(INC(F("O", outputValueTested), aux))
            else:
                ADD(EXC(F("O", outputValueTested), aux))

        # Read validation data as test data
        print("Loading validation examples")
        for x, label in tqdm(zip(X_val, y_val), total=len(X_val)):
            aux = None
            for feat_i in range(len(arr_feat_range)):
                sensors_variable_range = int(arr_feat_range[feat_i])
                if sensors_variable_range < 2:
                    continue
                sensorReading = int(x[feat_i])

                if sensorReading > sensors_variable_range - 1:
                    print(f"f{feat_i} r{sensorReading} m{sensors_variable_range - 1}")
                    raise IndexError(f"Sensor reading out of range")

                if sensorReading == 0:
                    aux = MM(aux, F(f"LE{feat_i}", sensorReading))
                elif sensorReading == sensors_variable_range - 1:
                    aux = MM(aux, F(f"G{feat_i}", sensorReading-1))
                else:
                    aux = MM(aux, F(f"LE{feat_i}", sensorReading))
                    aux = MM(aux, F(f"G{feat_i}", sensorReading-1))
            theEmbedding.REGION = 3
            if label == outputValueTested:
                ADD(INC(F("O", outputValueTested), aux))
            else:
                ADD(EXC(F("O", outputValueTested), aux))
    return DESC
