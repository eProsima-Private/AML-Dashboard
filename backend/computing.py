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

from amlip_py.node.AsyncComputingNode import AsyncComputingNode, JobReplier
from amlip_py.types.JobSolutionDataType import JobSolutionDataType

from aml_model_processing import train_alma

# Domain ID
DOMAIN_ID = 166

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
