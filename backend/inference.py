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
import os
import signal

from amlip_py.node.AsyncInferenceNode import AsyncInferenceNode, InferenceReplierLambda
from amlip_py.types.InferenceSolutionDataType import InferenceSolutionDataType

from AML_binary_classifier import calculate_misses
from aml_model_processing import process_model_data
from utils import use_most_recent_file

# Domain ID
DOMAIN_ID = 166
class InferenceNode():

    def __init__(self):

        print('Starting Async Inference Node Py execution. Creating Node...')
        self.inference_node = AsyncInferenceNode(
            'PyTestAsyncInferenceNode',
            listener=InferenceReplierLambda(self.process_inference),
            domain=DOMAIN_ID)
        print(f'Node created: {self.inference_node.get_id()}. '
          'Already processing inferences. Waiting SIGINT (C^)...')
        
    def run(self):

        self.inference_node.run()
    
    def stop(self):
        self.inference_node.stop()
        print('Stopping Async Inference Node Py execution.')
    
    def delete(self):
        del self.inference_node
        print ('Finishing Async Inference Node Py execution.')
    
    def get_id(self):
        return self.inference_node.get_id()
    
    def process_inference(
        self,
        inference,
        task_id,
        client_id):
        
        # Get the path to the Downloads directory
        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
        # Create the full path to the most recent file
        training_path=use_most_recent_file(downloads_path, "training_set_")
        model_path=use_most_recent_file(downloads_path, "model_")
        try:
            with open(model_path, 'r') as file:
                json_file = file.read()
            json_data = json.loads(json_file)
        except Exception as e:
            print(f'Error reading model file: {e}')
            exit(1)
        try:
            with open(training_path, 'r') as file:
                training_set = file.read()
        except Exception as e:
            print(f'Error reading training set file: {e}')
            exit(1)
        
        global aml_model_predict

        data = json.loads(inference.to_string().replace("'",'"'))

        try:
            model = json_data['model_name']
        except:
            model = 'Sensors'

        if model == 'Sensors':
            aml_model_predict = process_model_data(json_file, training_set)
            pred = aml_model_predict(data['data'])
        else:
            aml_model_predict = calculate_misses(training_set, json_file)
            print(aml_model_predict)
            pred = aml_model_predict(data['data'])

        print('pred: ' + str(pred))
        inference_solution = InferenceSolutionDataType(json.dumps(pred))

        print(f'Data received from client: {client_id}\n'
            f' with id: {task_id}\n'
            f' job: {inference.to_string()}\n'
            f' inference: {inference_solution.to_string()}')
        return inference_solution

def main():
    """Execute main routine."""

    # Create node
    inference_node = InferenceNode()

    # Start node
    inference_node.run()

    # Wait for signal
    def handler(signum, frame):
       pass
    signal.signal(signal.SIGINT, handler)
    signal.pause()

    inference_node.stop()

    # Stop node


# Call main in program execution
if __name__ == '__main__':
    main()
