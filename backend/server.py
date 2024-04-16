import json
import random
import pickle as pkl
import time

from flask import Flask, request, jsonify

from flask_cors import CORS

from py_utils.wait.IntWaitHandler import IntWaitHandler

from amlip_py.node.AsyncMainNode import AsyncMainNode, SolutionListener
from amlip_py.types.JobDataType import JobDataType
from amlip_py.node.ModelManagerReceiverNode import ModelManagerReceiverNode, ModelListener
from amlip_py.types.ModelReplyDataType import ModelReplyDataType
from amlip_py.types.ModelRequestDataType import ModelRequestDataType
from amlip_py.types.ModelStatisticsDataType import ModelStatisticsDataType
from amlip_py.types.AmlipIdDataType import AmlipIdDataType

statistics_data = None
model_data = None
solution_data = None

app = Flask(__name__)
CORS(app)

# Domain ID
DOMAIN_ID = 166

############################################################
########################### AML LISTENERS ##################
############################################################

class CustomModelListener(ModelListener):

    def __init__(self):
        super().__init__()

    def statistics_received(
            self,
            statistics: ModelStatisticsDataType) -> bool:

        global statistics_data
        statistics_data = pkl.loads(bytes(statistics.to_vector()))

        print('\n\nStatistics received: \n')
        print(statistics_data)
        print('\n')

        return True

    def model_received(
            self,
            model: ModelReplyDataType) -> bool:

        global model_data
        model_data = json.loads(model.to_string())

        print('\nReply received\n')

        return True

class CustomSolutionListener(SolutionListener):

    def __init__(self, waiter):
        self.waiter_ = waiter
        super().__init__()

    def solution_received(
            self,
            solution,
            task_id,
            server_id):
        global solution_data
        if solution_data is None:
            solution_data = json.loads(solution.to_string())
        else:
            solution_data.update(json.loads(solution.to_string()))

        self.waiter_.increase()

############################################################
########################### AML NODES ######################
############################################################

# Create request
data = ModelRequestDataType('MobileNet V1')

id_receiver = AmlipIdDataType('ModelManagerReceiver')

# Create nodes
print('Starting Model Manager Receiver Node Py execution. Creating Node...')
model_receiver_node = ModelManagerReceiverNode(
    id=id_receiver,
    data=data,
    domain=DOMAIN_ID)

model_receiver_node.start(
        listener=CustomModelListener())

# Create node
waiter = IntWaitHandler(True)
print('Starting Async Main Node Py execution. Creating Node...')
listener = CustomSolutionListener(waiter)
main_node = AsyncMainNode('PyTestAsyncMainNode', listener=listener, domain=DOMAIN_ID)

############################################################
########################### APPS ###########################
############################################################

@app.route('/fetcher/statistics', methods=['GET', 'POST'])
def add_statistics():

    global statistics_data

    while statistics_data is None:
        pass

    time.sleep(1)  # Sleep for 1 second

    print("Send statistics")

    return jsonify(statistics_data)


@app.route('/fetcher/model', methods=['GET', 'POST'])
def add_model():

    global model_data

    while model_data is None:
        pass

    time.sleep(1)  # Sleep for 1 second

    print("Send model")

    return jsonify(model_data)

@app.route('/train/<nJob>/<nIter>/<percentageData>', methods=['GET', 'POST'])
def add_message(nJob, nIter, percentageData):
    print("Received")

    n_jobs = 5

    content = request.json

    n_jobs = int(nJob)
    n_iter = int(nIter)
    percentage_data = int(percentageData)

    global solution_data
    solution_data = None

    for i in range(n_jobs):
        # Calculate data
        # Zip the two lists together to maintain correspondence
        zipped_data = list(zip(content['x'], content['y']))

        # Calculate how many items x% is
        num_items = len(zipped_data) * percentage_data // 100

        # Take a random sample of x% of the data
        sampled_zipped_data = random.sample(zipped_data, num_items)

        # Unzip the sampled data back into separate lists
        sampled_data_x, sampled_data_y = zip(*sampled_zipped_data)

        # Create job data
        print(f'Node created: {main_node.get_id()}. Creating job...')
        job_data = JobDataType('x: ' + json.dumps(sampled_data_x) + ' y: ' + json.dumps(sampled_data_y) + ' n_iter: ' + str(n_iter))

        # Sending job
        print(f'Job data created with string: {job_data}. Sending request...')
        task_id = main_node.request_job_solution(job_data)

    print('All jobs sent. Waiting for solutions...')
    waiter.wait_equal(n_jobs)
    print('All solutions received.')

    # try:
    #     with open('test_save.json', 'w') as file:
    #         json.dump(solution_data, file)
    #     print("JSON data saved to file successfully.")
    # except Exception as e:
    #     print(f"Error occurred while saving JSON data: {e}")

    return jsonify(solution_data)

if __name__ == "__main__":
    app.run(host= '0.0.0.0', port=5000,  debug=True)
