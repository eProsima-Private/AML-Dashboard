import json
import random
import pickle as pkl
import time
import threading

from flask import Flask, request, jsonify

from flask_cors import CORS

from py_utils.wait.IntWaitHandler import IntWaitHandler
from py_utils.wait.BooleanWaitHandler import BooleanWaitHandler

from amlip_py.node.AsyncMainNode import AsyncMainNode, SolutionListener
from amlip_py.types.JobDataType import JobDataType
from amlip_py.node.ModelManagerReceiverNode import ModelManagerReceiverNode, ModelListener
from amlip_py.types.ModelReplyDataType import ModelReplyDataType
from amlip_py.types.ModelRequestDataType import ModelRequestDataType
from amlip_py.types.ModelStatisticsDataType import ModelStatisticsDataType
from amlip_py.types.AmlipIdDataType import AmlipIdDataType
from amlip_py.node.StatusNode import StatusListener, StatusNode
from amlip_py.node.AsyncEdgeNode import AsyncEdgeNode, InferenceSolutionListener
from amlip_py.types.InferenceDataType import InferenceDataType
from amlip_py.types.InferenceSolutionDataType import InferenceSolutionDataType
from amlip_py.node.FiwareNode import FiwareNode

status_data = {}
status_data['nodes'] = []
statistics_data = None
model_data = None
solution_data = None

app = Flask(__name__)
CORS(app)

# Domain ID
DOMAIN_ID = 166

# Maps
node_kind_map = {
    0: 'undetermined',
    1: 'discovery',
    2: 'agent',
    3: 'main',
    4: 'computing',
    5: 'status',
    6: 'meta',
    7: 'edge',
    8: 'inference',
    9: 'model_receiver',
    10: 'model_sender'
}

state_map = {
    0: 'unknown',
    1: 'running',
    2: 'stopped',
    3: 'dropped'
}

############################################################
########################### AML IP LISTENERS ###############
############################################################

# Custom status listener
class CustomStatusListener(StatusListener):

    def __init__(self, node_id):
        self.node_id_ = node_id
        super().__init__()

    def status_received(self, status):
        print(f'Received {status} in Node {self.node_id_}.')

        global status_data

        data = {}
        data['ID'] = status.id().to_string()
        data['Kind'] = node_kind_map.get(status.node_kind())
        data['State'] = state_map.get(status.state())

        status_data['nodes'].append(data)

# Custom statistics/model listener
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

# Custom request listener
class CustomSolutionListener(SolutionListener):

    def __init__(self):
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

        global waiter_job
        waiter_job.increase()

class CustomInferenceListener(InferenceSolutionListener):

    def __init__(self):
        super().__init__()

    def inference_received(
            self,
            inference: InferenceSolutionDataType,
            task_id: int,
            server_id: int) -> bool:

        print(f'Data received from server: {server_id}\n'
            f' with id: {task_id}\n'
            f' inference: {inference.to_string()}')

        global inference_data
        inference_data = json.loads(inference.to_string())

        global waiter_inference
        waiter_inference.open()


############################################################
########################### AML IP NODES ###################
############################################################

### StatusNode ###

# Create node
print('Starting Status Node Py execution. Creating Node...')
status_node = StatusNode('PyTestCustomListenerStatusNode', domain=DOMAIN_ID)

# Create lambda
print(f'Node {status_node.get_id()} created. Creating Functor...')
status_listener = CustomStatusListener(status_node.get_id())

# Launch node
print('Functor created. Processing data asynchronously...')
status_node.process_status_async(listener=status_listener)

### ModelManagerReceiverNode ###

# Create request
data = ModelRequestDataType('MobileNet V1')
# Create ID
id_receiver = AmlipIdDataType('ModelManagerReceiver')

# Create node
print('Starting Model Manager Receiver Node Py execution. Creating Node...')
model_receiver_node = ModelManagerReceiverNode(
    id=id_receiver,
    data=data,
    domain=DOMAIN_ID)

model_receiver_node.start(
        listener=CustomModelListener())

### AsynMainNode ###

# Create node
print('Starting Async Main Node Py execution. Creating Node...')
main_node = AsyncMainNode(
    'PyTestAsyncMainNode',
    listener=CustomSolutionListener(),
    domain=DOMAIN_ID)

### AsyncEdgeNode ###

# Create node
print('Starting Async Edge Node Py execution. Creating Node...')
edge_node = AsyncEdgeNode(
    'PyTestAsyncEdgeNode',
    listener=CustomInferenceListener(),
    domain=DOMAIN_ID)


############################################################
########################### FLASK APPS #####################
############################################################

@app.route('/status', methods=['GET', 'POST'])
def add_status():

    global status_data

    while status_data is None:
        pass

    return_data = status_data
    status_data = {}
    status_data['nodes'] = []


    return jsonify(return_data)

@app.route('/fetcher/statistics', methods=['GET', 'POST'])
def add_statistics():

    global statistics_data

    while statistics_data is None:
        pass

    time.sleep(1)  # Sleep for 1 second

    return jsonify(statistics_data)


@app.route('/fetcher/model', methods=['GET', 'POST'])
def add_model():

    model_receiver_node.request_model()

    global model_data

    while model_data is None:
        pass

    time.sleep(1)  # Sleep for 1 second

    model = model_data
    model_data = None

    return jsonify(model)

@app.route('/train/<nJob>/<nIter>/<percentageData>', methods=['GET', 'POST'])
def add_message(nJob, nIter, percentageData):

    global waiter_job
    waiter_job = IntWaitHandler(True)

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
    waiter_job.wait_equal(n_jobs)
    print('All solutions received.')

    return jsonify(solution_data)

@app.route('/inference', methods=['GET', 'POST'])
def add_inference():

    global waiter_inference
    waiter_inference = BooleanWaitHandler(True, False)

    content = request.json

    global inference_data
    inference_data = None

    data = json.dumps(content)

    inference = InferenceDataType(data)

    task_id = edge_node.request_inference(inference)

    print(f'Request sent with task id: {task_id}. Waiting inference...')
    # Wait to received solution
    waiter_inference.wait()
    print('Inference received.')

    return jsonify(inference_data)

@app.route('/context_broker/fiware', methods=['GET', 'POST'])
def create_fiware_node():

    global fiware_node_content
    fiware_node_content = request.json

    print(f'Creating Fiware node with data: {fiware_node_content}')

    global fiware_node
    fiware_node = FiwareNode(
        name=fiware_node_content['Name'],
        server_ip=fiware_node_content['Server IP'],
        server_port=fiware_node_content['Server Port'],
        context_broker_ip=fiware_node_content['Context Broker IP'],
        context_broker_port=fiware_node_content['Context Broker Port'],
        entity_id=fiware_node_content['Entity ID'],
        entity_data=fiware_node_content['Attribute Data'],
        entity_solution=fiware_node_content['Attribute Solution'],
        domain=fiware_node_content['Domain']
    )

    fiware_run = threading.Thread(target=fiware_node.run)

    try:
        fiware_run.start()
    except:
        fiware_run.join()

    return jsonify({'message': 'OK'})

@app.route('/context_broker/data', methods=['GET', 'POST'])
def add_data():

    content = request.json

    global fiware_node
    # TODO change when :
    #   Failed to post data: 413 Client Error: Content Too Large for url: http://localhost:1026/v2/entities
    # is solved
    #  fiware_node.post_data(content['data'])
    fiware_node.post_data('HELLO WORLD!!!!!')

    return jsonify({'message': 'OK'})

@app.route('/context_broker/solution', methods=['GET', 'POST'])
def get_solution():

    global fiware_node
    solution = fiware_node.get_inference()

    return jsonify(solution)


if __name__ == "__main__":

    app.run(host= '0.0.0.0', port=5000)
