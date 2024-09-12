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
import numpy as np

from train_gestures import train_class, ModelConverter
from gesture_embedding import learn_prep_knn,  learn_prep_bayes

# Train the AML model
def train_alma(x, y, n_iter_max, prep='bayes'):
    # Get the classes and their count
    lst_classes = list(np.unique(y))
    n_classes = len(lst_classes)
    print(f"N CLASSES {n_classes} {lst_classes}")

    # Convert target labels to numerical indices
    y_train = np.array([lst_classes.index(v) for v in y])
    X_train = np.array(x)
    X_test, y_test = X_train, y_train

    # Preprocess the data based on the chosen method
    if prep == 'bayes':
        # Use Bayesian preprocessing
        X_train, X_test, arr_feat_range, edges = learn_prep_bayes(X_train, X_test)
    elif prep == 'kmeans':
        # Use K-means preprocessing
        X_train, X_test, arr_feat_range, edges = learn_prep_knn(X_train, X_test)

    # Dictionary to store information about trained models for each class
    map_classes = {}

    # Iterate over each class
    for out_class in lst_classes:
        # Train a model for the current class
        cmanager, lst_atoms = train_class(lst_classes.index(out_class), n_classes, './',
                                           X_train, y_train, X_test, y_test, arr_feat_range, n_iter_max)

        conv = ModelConverter(cmanager, lst_atoms, lst_classes.index(out_class))
        feat_conv = conv.get_const_map(arr_feat_range)

        atoms_conv = conv.get_atoms_relevant()
        print(atoms_conv)

        # Information about the trained model for each class
        map_classes[out_class] = [feat_conv, atoms_conv]

    # Return the dictionary containing information about trained models and preprocessing
    return {'edges' : [e.tolist() for e in edges], 'classes' : map_classes}

def build_aml_model(json_info):
    map_atoms = {}
    for cl_nm in json_info['classes']:
        lst_atoms_sets = []
        atoms = json_info['classes'][cl_nm][1]
        for atom_i in range(len(atoms)):
            set_atom = set(atoms[atom_i])
            lst_atoms_sets.append(set_atom)
        map_atoms[cl_nm] = {'inputs': json_info['classes'][cl_nm][0], 'atoms': lst_atoms_sets}

    def get_input_indexes(x_raw):
        input_indexes = []
        for xi in range(len(x_raw)):
            v = x_raw[xi]
            edges = json_info['edges'][xi]

            i = 0
            while i < len(edges) and v > edges[i]:
                i += 1
            input_indexes.append(i)
        return input_indexes

    def n_misses_per_class(x_raw):
        indexes = get_input_indexes(x_raw)
        map_misses = {}
        for cl_nm in map_atoms:
            my_input_consts = set()
            consts_here = map_atoms[cl_nm]['inputs']
            for fi in range(len(consts_here)):
                my_input_consts.add(consts_here[fi][indexes[fi]])
            n_misses = 0
            atoms_of_class = map_atoms[cl_nm]['atoms']
            for atom_i in range(len(atoms_of_class)):
                atom = atoms_of_class[atom_i]
                not_found = True
                for elem in my_input_consts:
                    if elem in atom:
                        not_found = False
                        break
                if not_found:
                    n_misses += 1
            map_misses[cl_nm] = n_misses
        return map_misses

    return n_misses_per_class

# @fn process_model_data - Processes model data to compute prediction probabilities.
#
# This function takes in the JSON data representing a machine learning model
# and the training set data to compute prediction probabilities based on the
# model's characteristics and the training set. It calculates the cumulative
# misses for the negatives, probability per miss per class, and constructs
# a prediction function based on the computed probabilities.
#
# @param {Object} json - The JSON data representing the machine learning model.
# @param {Object} trainingSet - The training set data used for model training.
#
# @returns {Function} - A prediction function based on the processed model data.
def process_model_data(json_str, training_set_str):
    json_info = json.loads(json_str)
    training_set = json.loads(training_set_str)

    n_misses_per_class = build_aml_model(json_info)

    map_neg_misses_per_class = {}
    for cl in json_info['classes']:
        map_neg_misses_per_class[cl] = {}

    dt = training_set['data']

    for i in range(len(dt)):
        map_curr_misses = n_misses_per_class(dt[i]['x'])
        for cl, m in map_curr_misses.items():
            if cl != dt[i]['y']:
                if m in map_neg_misses_per_class[cl]:
                    map_neg_misses_per_class[cl][m] += 1
                else:
                    map_neg_misses_per_class[cl][m] = 1

    map_p_per_miss_per_class = {}
    for cl in json_info['classes']:
        max_misses = len(json_info['classes'][cl][1])
        lst_cum = []
        sum_misses = 0
        for i_n_misses in range(max_misses):
            n_times = map_neg_misses_per_class[cl].get(i_n_misses, 0)
            sum_misses += i_n_misses * n_times
            lst_cum.append(sum_misses)
        for i_n_misses in range(max_misses): 
            #TODO: Take into account that division by zero is possible. Check if this is correct.
            lst_cum[i_n_misses] = 1.0 - (lst_cum[i_n_misses] / sum_misses)
        map_p_per_miss_per_class[cl] = lst_cum

    def aml_model_predict(x_raw):
        map_misses = n_misses_per_class(x_raw)
        selected_class = None
        best_prob = 0.0
        total_prob = 0.0
        map_probs = {}

        for cl_nm, n_misses_cl in map_misses.items():
            p_for_class_list = map_p_per_miss_per_class.get(cl_nm, [])
            if n_misses_cl < len(p_for_class_list):
                p_for_class = p_for_class_list[n_misses_cl]
            else:
                p_for_class = 0.0
            map_probs[cl_nm] = p_for_class
            total_prob += p_for_class
            if p_for_class >= best_prob:
                selected_class = cl_nm
                best_prob = p_for_class

        map_confs = {}
        e = 0.00000001
        total_prob += e * len(map_probs)
        for cl_nm in map_probs:
            map_confs[cl_nm] = (map_probs[cl_nm] + e) / total_prob

        return {'label': selected_class, 'confidences': map_confs}

    return aml_model_predict
