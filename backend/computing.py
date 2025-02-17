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

from amlip_py.node.AsyncComputingNode import AsyncComputingNode, JobReplierLambda
from amlip_py.types.JobSolutionDataType import JobSolutionDataType

from aml_model_processing import train_alma
from AML_binary_classifier import train_binary_classifier


# Domain ID
DOMAIN_ID = 166
class ComputingNode():

    def __init__(self):
        # Create node
        print('Starting Async Computing Node Py execution. Creating Node...')
        self.computing_node = AsyncComputingNode(
        'PyTestAsyncComputingNode',
        listener=JobReplierLambda(self.process_job),
        domain=DOMAIN_ID)
        print(f'Node created: {self.computing_node.get_id()}. '
            'Already processing jobs. Waiting SIGINT (C^)...')

    def run(self):
        self.computing_node.run()
    
    def stop(self):
        self.computing_node.stop()
        print('Stopping Async Computing Node Py execution.')

    def delete(self):
        del self.computing_node
        print ('Finishing Async Computing Node Py execution.')
    
    def get_id(self):
        return self.computing_node.get_id()
    
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
        target_class_index = data.find(' target_class: ')
        model_index = data.find(' model: ')
        atomization_index = data.find(' atomization_uploaded: ')
        # Extract the substring between 'x: ' and ' y: ' to get the value of x
        x = json.loads(data[x_index + len('x: '):y_index])
        # Extract the substring between ' y: ' and ' n_iter: ' to get the value of y
        y = json.loads(data[y_index + len(' y: '):n_iter_index])
        # Extract the substring from ' n_iter: ' to the end of the string to get the value of n_iter
        n_iter = int(data[n_iter_index + len(' n_iter: '):target_class_index])
        # Extract the substring from ' target_class: ' to the end of the string to get the value of target_class
        target_class = int(data[target_class_index + len(' target_class: '):model_index])
        # Extract the substring from ' model: ' to the end of the string to get the value of model
        model_type = data[model_index + len(' model: '):atomization_index]
        # Extract the substring from ' atomization_uploaded: ' to the end of the string to get the value of atomization_uploaded
        atomization_uploaded = bool(data[atomization_index + len(' atomization_uploaded: '):] == 'True')
        print('Received job, calling train_alma')
        if model_type == 'Sensors':
            model = train_alma(x, y, n_iter)
        else: 
            print ('calling train_binary_classifier')
            model = train_binary_classifier(model_type, x, y, target_digit=target_class, iterations=n_iter, uploaded_atomization=atomization_uploaded)
        print('train_alma finished!')
        solution = JobSolutionDataType(json.dumps(model))
        return solution

def main():
    """Execute main routine."""

    # Create node
    computing_node = ComputingNode()

    # Start node
    computing_node.run()

    # Wait for signal
    def handler(signum, frame):
        pass
    signal.signal(signal.SIGINT, handler)
    signal.pause()
#
    ## Stop node
    computing_node.stop()

# Call main in program execution
if __name__ == '__main__':
    main()
