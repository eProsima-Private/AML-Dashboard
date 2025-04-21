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

import aml
from aml.aml_fast.amlFastBitarrays import bitarray
import os
import json

from utils import use_most_recent_file

def load_model(file_path):
    # Load the atomization
    cmanager, batchLearner = aml.loadAtomizationFromFileUsingBitarrays(file_path)
    return cmanager, batchLearner

def map_atomization_to_dict(cmanager, batchLearner, model_name):
    """
    This function maps the atomization to a dictionary to be used in the frontend
    :param cmanager: The constant manager
    :param batchLearner: The batch learner
    :param model_name: The name of the model
    :return: A dictionary with the atomization
    """
    
    json_dict = {}
    json_dict['model_name'] = model_name
    json_dict['model_size'] = batchLearner.__sizeof__()
    for k, v in cmanager.getReversedNameDictionary().items():
        json_dict['vTerm: ' + v] = int(k)

    for int_const in cmanager.embeddingConstants:
        list_atomization = []
        map_atomization = {}
        for atom in batchLearner:
            if int_const in atom.ucs:
                bitarray_atom_to_list = list(atom.ucs)
                atom_epoch = atom.epoch
                atom_gen = atom.gen
                map_atomization['atom_epoch'] = atom_epoch
                map_atomization['atom_gen'] = atom_gen
                map_atomization['atom_ucs'] = bitarray_atom_to_list
                list_atomization.append(map_atomization)
        json_dict[int_const] = list_atomization
    return json_dict

def create_atom_from_json(json_info):
    """
    This function creates an atom from a json
    :param json_info: The json with the atom information
    :return: A list with the atomization
    """
    json_info = json.loads(json_info)
    atomization = []
    for key in json_info:
        if key == 'model_name' or key == 'model_size' or key == 'vTerm':
            pass
        else:
            for atom in json_info[key]:
                atom_epoch = atom['atom_epoch']
                atom_gen = atom['atom_gen']
                bitarray_atom = bitarray(atom['atom_ucs'])
                new_atom = aml.Atom(atom_epoch, atom_gen, bitarray_atom)
                atomization.append(new_atom)
    return atomization
