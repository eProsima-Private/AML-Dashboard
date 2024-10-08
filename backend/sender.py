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

import pickle as pkl
import signal
import os


from py_utils.wait.BooleanWaitHandler import BooleanWaitHandler

from amlip_py.node.ModelManagerSenderNode import ModelManagerSenderNode, ModelReplier
from amlip_py.types.AmlipIdDataType import AmlipIdDataType
from amlip_py.types.ModelReplyDataType import ModelReplyDataType
from amlip_py.types.ModelRequestDataType import ModelRequestDataType

from utils import use_most_recent_file

# Domain ID
DOMAIN_ID = 166

# Variable to wait to the model request
waiter = BooleanWaitHandler(True, False)

# Custom model replier
class CustomModelReplier(ModelReplier):

    def fetch_model(
            self,
            request: ModelRequestDataType) -> ModelReplyDataType:

        print('Request received:\n')
        print(request.to_string())
        print('\n')
        

        # Get the path to the Downloads directory
        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
        
        # Determine the path to the most recent model file
        model_path=use_most_recent_file(downloads_path, "model_")

        try:
            with open(model_path, 'r') as file:
                file_data = file.read()
            reply = ModelReplyDataType(file_data)
            print('Publish reply\n')
            return reply
        except Exception as e:
            print(f'Error reading training set file: {e}')  
            exit(1) 


def main():
    """Execute main routine."""

    # Create ID
    id_sender = AmlipIdDataType('ModelManagerSender')

    # Create node
    model_sender_node = ModelManagerSenderNode(
        id=id_sender,
        domain=DOMAIN_ID)

    print(f'Node created: {model_sender_node.get_id()}. '
          'Already processing models.')

     #e.g. statistics data
    data = {
         'name': 'MobileNet V1',
         'size': 56
     }

    # Start node
    model_sender_node.start(
        listener=CustomModelReplier())

    statistics_dump = pkl.dumps(data)

    print('\n\nPublish statistics: \n')
    print(data)
    print('\n')

    model_sender_node.publish_statistics(
        'ModelManagerSenderStatistics',
        statistics_dump)

    # Wait for signal
    def handler(signum, frame):
        pass
    signal.signal(signal.SIGINT, handler)
    signal.pause()

    # Stop node
    model_sender_node.stop()

    print('Finishing Model Manager Sender Node Py execution.')


# Call main in program execution
if __name__ == '__main__':
    main()
