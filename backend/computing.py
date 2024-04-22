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
import signal
import numpy as np

from train_gestures import train_class, ModelConverter

from gesture_embedding import learn_prep_knn,  learn_prep_bayes

from amlip_py.node.AsyncComputingNode import AsyncComputingNode, JobReplier
from amlip_py.types.JobSolutionDataType import JobSolutionDataType

# Domain ID
DOMAIN_ID = 166

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

# Custom job replier
class CustomJobReplier(JobReplier):

    def process_job(
            self,
            job,
            task_id,
            client_id):

        data = job.to_string()
        # Find the indices of 'x: ' and ' y: ' in the data string
        x_index = data.find('x: ')
        y_index = data.find(' y: ')
        n_iter_index = data.find(' n_iter: ')

        # Extract the substring between 'x: ' and ' y: ' to get the value of x
        x = json.loads(data[x_index + len('x: '):y_index])
        # Extract the substring between ' y: ' and ' n_iter: ' to get the value of y
        y = json.loads(data[y_index + len(' y: '):n_iter_index])
        # Extract the substring from ' n_iter: ' to the end of the string to get the value of n_iter
        n_iter = int(data[n_iter_index + len(' n_iter: '):])

        print('Received job, calling train_alma')
        model = train_alma(x, y, n_iter)
        print('train_alma finished!')

        solution = JobSolutionDataType(json.dumps(model))
        return solution


def main():
    """Execute main routine."""
    # Initialize random number generator
    # TODO

    # Create node
    print('Starting Async Computing Node Py execution. Creating Node...')
    computing_node = AsyncComputingNode(
        'PyTestAsyncComputingNode',
        listener=CustomJobReplier(),
        domain=DOMAIN_ID)

    # Create job data
    print(f'Node created: {computing_node.get_id()}. '
          'Already processing jobs. Waiting SIGINT (C^)...')

    # Start node
    computing_node.run()

    # Wait for signal
    def handler(signum, frame):
        pass
    signal.signal(signal.SIGINT, handler)
    signal.pause()

    # Stop node
    computing_node.stop()

    print('Finishing Async Computing Node Py execution.')


# Call main in program execution
if __name__ == '__main__':
    main()
