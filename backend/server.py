import json
import random
import os
import pickle as pkl
import threading
import default_values

from flask import Flask, request, jsonify

from flask_cors import CORS

from amlip_swig import TransportProtocol_udp, TransportProtocol_tcp

from py_utils.wait.BooleanWaitHandler import BooleanWaitHandler
from py_utils.wait.IntWaitHandler import IntWaitHandler
from py_utils.wait.WaitHandler import AwakeReason

from amlip_py.node.AsyncEdgeNode import AsyncEdgeNode, InferenceSolutionListener
from amlip_py.node.AsyncMainNode import AsyncMainNode, SolutionListener
from amlip_py.node.ClientNode import ClientNode
from amlip_py.node.FiwareNode import FiwareNode
from amlip_py.node.ModelManagerReceiverNode import ModelManagerReceiverNode, ModelListener
from amlip_py.node.RepeaterNode import RepeaterNode
from amlip_py.node.ServerNode import ServerNode
from amlip_py.node.StatusNode import StatusListener, StatusNode


from amlip_py.types.Address import Address
from amlip_py.types.AmlipIdDataType import AmlipIdDataType
from amlip_py.types.InferenceDataType import InferenceDataType
from amlip_py.types.InferenceSolutionDataType import InferenceSolutionDataType
from amlip_py.types.JobDataType import JobDataType
from amlip_py.types.ModelReplyDataType import ModelReplyDataType
from amlip_py.types.ModelRequestDataType import ModelRequestDataType
from amlip_py.types.ModelStatisticsDataType import ModelStatisticsDataType

from loadDatasets import loadMedMnist, loadCIFAR10, loadKMNIST, loadMNIST
from utils import save_in_format

# Global variables

# Stores the status data, including a list of nodes
status_data = {}
status_data['nodes'] = []
# Holds the statistics data 
statistics_data = None
# Holds the model data 
model_data = None
# Holds the solution data from the model training
solution_data = None
# Holds the information of the created computing nodes
computing_nodes = {}
# Boolean to check if the atomization file has been uploaded
atomization_uploaded = False
# Holds the information of the created inference nodes
inference_nodes = {}
# Holds the information of the stopped computing nodes
stopped_computing_nodes = {}
# Holds the information of the stopped inference nodes
stopped_inference_nodes = {}
# BooleanWaitHandler object to manage waiting for statistics data
waiter_statistics=BooleanWaitHandler(True, False)
# BooleanWaitHandler object to manage waiting for model data
waiter_model=BooleanWaitHandler(True, False)
# IntWaitHandler object to manage waiting for training job completion
waiter_job=IntWaitHandler(True)
# BooleanWaitHandler object to manage waiting for inference solution
waiter_inference = BooleanWaitHandler(True, False)

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
        global statistics_server_id
        statistics_server_id = statistics.server_id()
        
        print('\n\nStatistics received: \n')
        print(statistics_data)
        print('\n')

        waiter_statistics.open()

        return True

    def model_received(
            self,
            model: ModelReplyDataType) -> bool:

        global model_data
        model_data = json.loads(model.to_string())

        print('\nReply received\n')

        waiter_model.open()

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
        inference_data = None
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


##############################################################
########################### FLASK APPS #######################
##############################################################

##############################################################
###                     DATA MANAGEMENT                    ###
##############################################################

@app.route('/datasets/<Model>', methods=['GET', 'POST'])
def load_dataset(Model):
    model = Model
    if model == 'Sensors':
        pass
    elif model == 'MNIST':
        test_images, test_labels = loadMNIST('MNIST').load_testing()
        content = save_in_format(test_images.tolist(), test_labels.tolist())
    elif model == 'KMNIST':
        test_images, test_labels = loadKMNIST().load_testing()
        content = save_in_format(test_images.tolist(), test_labels.tolist())
    elif model == 'MedMNIST':
        test_images, test_labels = loadMedMnist().load_testing()
        content = save_in_format(test_images.tolist(), test_labels.tolist())
    elif model == 'Fashion MNIST':
        test_images, test_labels = loadMNIST('Fashion_MNIST').load_testing()
        content = save_in_format(test_images.tolist(), test_labels.tolist())
    elif model == 'CIFAR10':
        test_images, test_labels = loadCIFAR10().load_testing()
        content = save_in_format(test_images.tolist(), test_labels.tolist())
    elif model == 'Custom':
        dataset = request.files['file']
        if os.path.exists('Custom_Dataset') == False:
            os.mkdir('Custom_Dataset')
        else:
            for f in os.listdir('Custom_Dataset'):
                os.remove(f'Custom_Dataset/{f}')
    
        dataset.save(f'Custom_Dataset/{dataset.filename}')
        print('Dataset uploaded')
        return jsonify({'message': 'OK'})

    else:
        return jsonify({'Error': 'Model not found'})

    return jsonify(content)

##############################################################
###                       STATUS NODE                      ###
##############################################################

@app.route('/status', methods=['GET', 'POST'])
def add_status():

    global status_data

    return_data = status_data
    status_data = {}
    status_data['nodes'] = []

    return jsonify(return_data)

##############################################################
###                       SENDER NODE                      ###
##############################################################

# ------------------- Create sender node -------------------

@app.route('/fetcher/sender', methods=['GET', 'POST'])
def create_sender_node():
    from sender import SenderNode
    global model_sender_node
    model_sender_node = SenderNode()
    try:
        model_sender_node.run()
        return jsonify({'message': 'OK'})
    except Exception as e:
        print(f'There has been an error while trying to start the Model Sender Node {e}')
        return jsonify({'Error': f'There has been an error while trying to start the Model Sender Node {e}'})

# -------------------- Delete sender node --------------------

@app.route('/fetcher/sender/drop', methods=['GET', 'POST'])
def drop_sender_node():
    global model_sender_node
    try:
        model_sender_node.delete()
        return jsonify({'message': 'OK'})
    except Exception as e:
        print(f'There has been an error while trying to delete the Model Sender Node {e}')
        return jsonify({'Error': f'There has been an error while trying to delete the Model Sender Node {e}'})
    
# -------------------- Fetch statistics ----------------------

@app.route('/fetcher/statistics', methods=['GET', 'POST'])
def add_statistics():
    global statistics_data

    reason=waiter_statistics.wait(default_values.TIMEOUT_STATISTICS)
    if reason==AwakeReason.timeout:
        print('Timeout reached. No new statistics have been received.')
        return jsonify({'Error': 'Timeout reached. No new statistics have been received.'})

    statistics=statistics_data
    statistics_data = None
    waiter_statistics.close()
    return jsonify(statistics)

# -------------------- Fetch model ---------------------------

@app.route('/fetcher/model', methods=['GET', 'POST'])
def add_model():
    waiter_model.close()
    global statistics_server_id
    model_receiver_node.request_model(statistics_server_id)
    global model_data
    
    reason=waiter_model.wait(default_values.TIMEOUT_MODEL)
    if reason==AwakeReason.timeout:
        print('Timeout reached.')
        return jsonify({'Error': 'Timeout reached.'})

    model = model_data
    model_data = None
    return jsonify(model)

##############################################################
###                    COMPUTING NODE                      ###
##############################################################

# ------------------ Create computing node ------------------

@app.route('/computing/start', methods=['GET', 'POST'])
def create_computing_node():
    # Create node
    from computing import ComputingNode
    global computing_node
    global computing_nodes
    computing_node = ComputingNode()
    computing_run= threading.Thread(target=computing_node.run)
    node_id=str(computing_node.get_id())
    try:
        computing_run.start()
        computing_nodes[node_id] = {
            'node': computing_node,
            'thread': computing_run
        }
        print(computing_nodes)
        return jsonify({'message': 'OK'})
    except Exception as e:
        computing_run.join()
        print(f'There has been an error while trying to start the Computing Node {e}')
        return jsonify({'Error': f'There has been an error while trying to start the Computing Node {e}'})

# ------------------- Stop computing node -------------------

@app.route('/computing/stop', methods=['GET', 'POST'])
def stop_computing_node():
    global computing_nodes
    global stopped_computing_nodes
    global computing_node_object
    node_id = request.json['Node ID']
    
    try:
        if node_id in computing_nodes:
            node_data = computing_nodes[node_id]
            computing_node_object = node_data['node']
            thread = node_data['thread']

            computing_node_object.stop()
            thread.join()
            stopped_computing_nodes[node_id] = {
                'node': node_data['node'],
                'thread': thread
            }
            del computing_nodes[node_id]
            return jsonify({'message': 'OK'})

        elif node_id == 'all' or node_id=='All':
            for id in computing_nodes:
                node_data = computing_nodes[id]
                computing_node_object = node_data['node']
                thread = node_data['thread']

                computing_node_object.stop()
                thread.join()
                stopped_computing_nodes[id] = {
                    'node': node_data['node'],
                    'thread': thread
                }

            computing_nodes.clear()
            return jsonify({'message': 'OK'})
        else:
            return jsonify({'Error': 'Node ID not found'})
        
    except Exception as e:
        print(f'There has been an error while trying to stop the Computing Node {e}')
        return jsonify({'Error': f'There has been an error while trying to stop the Computing Node {e}'})  

# ------------------- Run computing node --------------------

@app.route('/computing/run', methods=['GET', 'POST'])
def run_computing_node():
    global stopped_computing_nodes
    global computing_node_object
    node_id = request.json['Node ID']
    try:
        if node_id in stopped_computing_nodes:
            node_data = stopped_computing_nodes[node_id]
            computing_node_object = node_data['node']
            computing_run = threading.Thread(target=computing_node_object.run)  
            computing_run.start()
            computing_nodes[node_id] = {
                'node': node_data['node'],
                'thread': computing_run
            }
            del stopped_computing_nodes[node_id]
            return jsonify({'message': 'OK'})
        
        elif node_id == 'all' or node_id=='All':
            for id in stopped_computing_nodes:
                node_data = stopped_computing_nodes[id]
                computing_node_object = node_data['node']
                computing_run = threading.Thread(target=computing_node_object.run)
                computing_run.start()
                computing_nodes[id] = {
                    'node': node_data['node'],
                    'thread': computing_run
                }

            stopped_computing_nodes.clear()
            return jsonify({'message': 'OK'})
        
        else: 
            return jsonify({'Error': 'Node ID not found'})

    except Exception as e:
        print(f'There has been an error while trying to run the Computing Node {e}')
        return jsonify({'Error': f'There has been an error while trying to run the Computing Node {e}'})

# ------------------- Drop computing node -------------------

@app.route('/computing/drop', methods=['GET', 'POST'])
def drop_computing_node():
    global computing_nodes
    global stopped_computing_nodes
    global computing_node_object
    available_nodes = computing_nodes | stopped_computing_nodes
    node_id = request.json['Node ID']

    try:
        if node_id in available_nodes:
            node_data = available_nodes[node_id]
            computing_node_object = node_data['node']
            thread = node_data['thread']

            computing_node_object.delete()
            thread.join()
            if node_id in computing_nodes:
                del computing_nodes[node_id]
            else:
                del stopped_computing_nodes[node_id]
            return jsonify({'message': 'OK'})
        
        elif node_id == 'all' or node_id=='All':
            for id in available_nodes:
                node_data = available_nodes[id]
                computing_node_object = node_data['node']
                thread = node_data['thread']
                computing_node_object.delete()
                thread.join()

            available_nodes.clear()
            stopped_computing_nodes.clear()
            computing_nodes.clear()
            return jsonify({'message': 'OK'})
        
        else:
            return jsonify({'Error': 'Node ID not found'})
        

    except Exception as e:
        print(f'There has been an error while trying to delete the Computing Node {e}')
        return jsonify({'Error': f'There has been an error while trying to delete the Computing Node {e}'})

# ------------------ Upload atomization file -----------------

@app.route('/atomization', methods=['GET', 'POST'])
def load_atomization():
    global file
    file = request.files['file']
    if os.path.exists('files_uploaded') == False:
        os.mkdir('files_uploaded')
    else:
        for f in os.listdir('files_uploaded'):
            os.remove(f'files_uploaded/{f}')
    
    file.save(f'files_uploaded/{file.filename}')

    global atomization_uploaded
    atomization_uploaded = True
    print(file)
    return jsonify({'message': 'OK'})

# ----------------- Delete atomization file ------------------

@app.route('/atomization/delete', methods=['GET', 'POST'])
def delete_atomization():
    global atomization_uploaded
    atomization_uploaded = False
    for f in os.listdir('files_uploaded'):
        os.remove(f'files_uploaded/{f}')
    return jsonify({'message': 'OK'})

# ----------------------- Train model ------------------------

@app.route('/train/<nJob>/<nIter>/<percentageData>/<Model>/<targetClass>/<atomizationUploaded>', methods=['GET', 'POST'])
def add_message(nJob, nIter, percentageData, Model, targetClass, atomizationUploaded):
    waiter_job.set_value(0)
    atomization_uploaded = True if atomizationUploaded == 'true' else False
    print(atomization_uploaded)
    n_jobs = int(nJob)
    n_iter = int(nIter)
    percentage_data = int(percentageData)
    target_class = int(targetClass)

    model = Model

    if model == 'Sensors':
        content = request.json
    elif model == 'MNIST':
        training_images, training_labels = loadMNIST('MNIST').load_training()
        content = {'x': training_images.tolist(), 'y': training_labels.tolist()}
    elif model == 'KMNIST':
        training_images, training_labels = loadKMNIST().load_training()
        content = {'x': training_images.tolist(), 'y': training_labels.tolist()}
    elif model == 'MedMNIST':
        training_images, training_labels = loadMedMnist().load_training()
        content = {'x': training_images.tolist(), 'y': training_labels.tolist()}
    elif model == 'Fashion MNIST':
        training_images, training_labels = loadMNIST('Fashion_MNIST').load_training()
        content = {'x': training_images.tolist(), 'y': training_labels.tolist()}
    elif model == 'CIFAR10':
        training_images, training_labels = loadCIFAR10().load_training()
        content = {'x': training_images.tolist(), 'y': training_labels.tolist()}
    elif model == 'Custom':
        try:
            for f in os.listdir('Custom_Dataset'):
                with open(f'Custom_Dataset/{f}', 'r') as f:
                    json_file = f.read()
                    json_content = json.loads(json_file)
                    dataset = json_content['instances']
                    images = [image['x'] for image in dataset]
                    labels = [label['y'] for label in dataset]
                    content = {'x': images, 'y': labels}
        except Exception as e:
            print(f'Error loading custom dataset: {e}')
            return jsonify({'Error': f'Error loading custom dataset: {e}'})
    else:
        return jsonify({'Error': 'Model not found'})

    global solution_data
    solution_data = None
    try:
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
            print(f'Sampled data: {sampled_data_x} {sampled_data_y}')

            # Create job data
            print(f'Node created: {main_node.get_id()}. Creating job...')
            job_data = JobDataType('x: ' + json.dumps(sampled_data_x) + ' y: ' + json.dumps(sampled_data_y) + ' n_iter: ' + str(n_iter) + ' target_class: ' + str(target_class) + ' model: ' + str(model) + ' atomization_uploaded: ' + str(atomization_uploaded))

            # Sending job
            print(f'Job data created with string: {job_data}. Sending request...')
            task_id = main_node.request_job_solution(job_data)
    except ValueError as e:
        print(f'The data provided is not correct: {e}.')
        return jsonify({'Error': f'The data provided is not correct {e}'})

    print('All jobs sent. Waiting for solutions...')
    reason=waiter_job.wait_equal(n_jobs, default_values.TIMEOUT_MODEL_TRAINING)
    if reason==AwakeReason.timeout:
        print('Timeout reached.')
        return jsonify({'Error': 'Timeout reached.'})
    else:
        print('All solutions received.')
        return jsonify(solution_data)
    
##############################################################
###                    INFERENCE NODE                      ###
##############################################################

# ------------------ Create inference node ------------------

@app.route('/inference_node/create', methods=['GET', 'POST'])
def create_inference_node():
    # Create node
    from inference import InferenceNode
    global inference_node

    inference_node = InferenceNode()
    inference_run = threading.Thread(target=inference_node.run)
    node_id=str(inference_node.get_id())
 
    try:
        inference_run.start()
        inference_nodes[node_id] = {
            'node': inference_node,
            'thread': inference_run
        }
        return jsonify({'message': 'OK'})
    except Exception as e:
        inference_run.join()
        print(f'There has been an error while trying to start the Inference Node {e}')
        return jsonify({'Error': f'There has been an error while trying to start the Inference Node {e}'})

# ------------------- Stop inference node -------------------

@app.route('/inference_node/stop', methods=['GET', 'POST'])
def stop_inference_node():
    global inference_nodes
    global inference_node_object
    global stopped_inference_nodes
    node_id = request.json['Node ID']
    try:
        if node_id in inference_nodes:
            node_data = inference_nodes[node_id]
            inference_node_object = node_data['node']
            thread = node_data['thread']

            inference_node_object.stop()
            thread.join()
            stopped_inference_nodes[node_id] = {
                'node': node_data['node'],
                'thread': thread
            }
            del inference_nodes[node_id]
            return jsonify({'message': 'OK'})

        elif node_id == 'all' or node_id=='All':
            for id in inference_nodes:
                node_data = inference_nodes[id]
                inference_node_object = node_data['node']
                thread = node_data['thread']

                inference_node_object.stop()
                thread.join()
                stopped_inference_nodes[id] = {
                    'node': node_data['node'],
                    'thread': thread
                }
            inference_nodes.clear()

            return jsonify({'message': 'OK'})

        else:
            return jsonify({'Error': 'Node ID not found'})

    except Exception as e:
        print(f'There has been an error while trying to stop the Inference Node {e}')
        return jsonify({'Error': f'There has been an error while trying to stop the Inference Node {e}'})
    
# ------------------- Run inference node --------------------

@app.route('/inference_node/run', methods=['GET', 'POST'])
def run_inference_node():
    global stopped_inference_nodes
    global inference_node_object
    node_id = request.json['Node ID']

    try:
        if node_id in stopped_inference_nodes:
            node_data = stopped_inference_nodes[node_id]
            inference_node_object = node_data['node']
            inference_run = threading.Thread(target=inference_node_object.run)
            inference_run.start()
            inference_nodes[node_id] = {
                'node': node_data['node'],
                'thread': inference_run
            }
            del stopped_inference_nodes[node_id]
            return jsonify({'message': 'OK'})
        
        elif node_id == 'all' or node_id=='All':
            for id in stopped_inference_nodes:
                node_data = stopped_inference_nodes[id]
                inference_node_object = node_data['node']
                inference_run = threading.Thread(target=inference_node_object.run)
                inference_run.start()
                inference_nodes[id] = {
                    'node': node_data['node'],
                    'thread': inference_run
                }
            stopped_inference_nodes.clear()

            return jsonify({'message': 'OK'})

        else:
            return jsonify({'Error': 'Node ID not found'})
        
    except Exception as e:
        print(f'There has been an error while trying to run the Inference Node {e}')
        return jsonify({'Error': f'There has been an error while trying to run the Inference Node {e}'})

# ------------------- Drop inference node -------------------

@app.route('/inference_node/drop', methods=['GET', 'POST'])
def drop_inference_node():
    global inference_nodes
    global inference_node_object
    global stopped_inference_nodes
    available_nodes = inference_nodes | stopped_inference_nodes
    node_id = request.json['Node ID']

    try:
        if node_id in available_nodes:
            node_data = available_nodes[node_id]
            inference_node_object = node_data['node']
            thread = node_data['thread']

            inference_node_object.delete()
            thread.join()
            if node_id in inference_nodes:
                del inference_nodes[node_id]
            else:
                del stopped_inference_nodes[node_id]
            return jsonify({'message': 'OK'})

        elif node_id == 'all' or node_id=='All':
            for id in available_nodes:
                node_data = available_nodes[id]
                inference_node_object = node_data['node']
                thread = node_data['thread']
                inference_node_object.delete()
                thread.join()

            available_nodes.clear()
            inference_nodes.clear()
            stopped_inference_nodes.clear()
            return jsonify({'message': 'OK'})

        else:
            return jsonify({'Error': 'Node ID not found'})
        
    except Exception as e:
        print(f'There has been an error while trying to delete the Inference Node {e}')
        return jsonify({'Error': f'There has been an error while trying to delete the Inference Node {e}'})
    
# -------------------- Request Inference ---------------------

@app.route('/inference', methods=['GET', 'POST'])
def add_inference():
    waiter_inference.close()

    content = request.json
    print(content)
    data_model = {'data' : content['data']}
    print(data_model)
    global inference_data

    data = json.dumps(data_model)

    inference = InferenceDataType(data)

    task_id = edge_node.request_inference(inference)

    print(f'Request sent with task id: {task_id}. Waiting inference...')

    # Wait to received solution
    reason=waiter_inference.wait(default_values.TIMEOUT_INFERENCE)
    if reason==AwakeReason.timeout:
        print('Timeout reached.')
        return jsonify({'Error': 'Timeout reached.'})
    else:
        print('Inference received.')
        return jsonify(inference_data)
    
##############################################################
###                      FIWARE NODE                       ###
##############################################################

# ------------------ Create Fiware node ---------------------

@app.route('/context_broker/fiware', methods=['GET', 'POST'])
def create_fiware_node():
    fiware_node_content = request.json
    global fiware_node                                                                
    try:
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
    except Exception as e:
        print(f'There has been an error while trying to create the Fiware Node {e}')
        return jsonify({'Error': f'There has been an error while trying to create the Fiware Node {e}'})
    
    fiware_run = threading.Thread(target=fiware_node.run)

    try:
        fiware_run.start()
        return jsonify({'message': 'OK'})
    except Exception as e:
        fiware_run.join()
        print(f'There has been an error while trying to start the Fiware Node {e}')
        return jsonify({'Error': f'There has been an error while trying to start the Fiware Node {e}'})
    
# --------------- Post data to Context Broker ----------------
    
@app.route('/context_broker/data', methods=['GET', 'POST'])
def add_data():
    content = request.json

    global fiware_node
    
    try:
        fiware_node.post_data(content, default_values.TIMEOUT_POST_DATA)
        return jsonify({'message': 'OK'})
    except Exception as e:
        print(f'Failed to post data: {e}')
        return jsonify({'Error': f'Failed to post data {e}'})
    
# ------------ Get inference from Context Broker -------------

@app.route('/context_broker/solution', methods=['GET', 'POST'])
def get_solution():
    global fiware_node
    solution = fiware_node.get_inference(default_values.TIMEOUT_FIWARE_SOLUTION)
    if isinstance(solution, str):
        sol=json.loads(solution)
        return jsonify(sol)

    return jsonify(solution)

##############################################################
###                       AGENT NODE                       ###
##############################################################

######################### Client Node ########################

# -------------------- Create client node --------------------

@app.route('/client_node', methods=['GET', 'POST'])
def create_client_node():
    client_node_content = request.json # we need to get the name, commection adress and domain from the aml dashboard user
    global client_node

    if client_node_content['Transport Protocol'] == 'UDP':
        transport_protocol = TransportProtocol_udp
    elif client_node_content['Transport Protocol'] == 'TCP':
        transport_protocol = TransportProtocol_tcp
    else:
        return jsonify({'Error': 'Transport Protocol not supported'})
    try:
        
        adress = Address(
            ip = client_node_content['Server IP Address'],
            port = client_node_content['Server Address Port'],
            external_port = client_node_content['Server Address Port'],
            transport_protocol = transport_protocol
        )

        client_node = ClientNode(
            name=client_node_content['Name'],
            connection_addresses=[adress],
            domain=client_node_content['Domain']
        )
        return jsonify({'message': 'OK'})
    except Exception as e:
        print(f'There has been an error while trying to create the Client Node {e}')
        return jsonify({'Error': f'There has been an error while trying to create the Client Node {e}'})

# -------------- Stop and Delete client node -----------------

@app.route('/client_node/stop', methods=['GET', 'POST'])
def stop_client_node():
    global client_node
    try:
        del client_node
        return jsonify({'message': 'OK'})
    except Exception as e:
        print(f'There has been an error while trying to stop the Client Node {e}')
        return jsonify({'Error': f'There has been an error while trying to stop the Client Node {e}'})
    
######################### Server Node ########################

# -------------------- Create server node --------------------

@app.route('/server_node', methods=['GET', 'POST'])
def create_server_node():
    server_node_content = request.json # we need to get the name, commection adress and domain from the aml dashboard user
    global server_node

    if server_node_content['Transport Protocol'] == 'UDP' or server_node_content['Transport Protocol'] == 'udp':
        transport_protocol = TransportProtocol_udp
    elif server_node_content['Transport Protocol'] == 'TCP' or server_node_content['Transport Protocol'] == 'tcp':
        transport_protocol = TransportProtocol_tcp
    else:
        return jsonify({'Error': 'Transport Protocol not supported'})

    try:
        print(server_node_content)
        adress = Address(
            ip = server_node_content['Server IP Address'],
            port = server_node_content['Server Address Port'],
            external_port = server_node_content['Server Address Port'],
            transport_protocol = transport_protocol
        )

        server_node = ServerNode(
            name=server_node_content['Name'],
            listening_addresses=[adress],
            domain=server_node_content['Domain']
        )
        return jsonify({'message': 'OK'})
    
    except Exception as e:
        print(f'There has been an error while trying to create the Server Node {e}')
        return jsonify({'Error': f'There has been an error while trying to create the Server Node {e}'})
    
# --------------- Stop and Delete server node ----------------

@app.route('/server_node/stop', methods=['GET', 'POST'])
def stop_server_node():
    global server_node
    try:
        del server_node
        return jsonify({'message': 'OK'})
    except Exception as e:
        print(f'There has been an error while trying to stop the Server Node {e}')
        return jsonify({'Error': f'There has been an error while trying to stop the Server Node {e}'})
    
####################### Repeater Node #######################

# ------------------- Create repeater node ------------------

@app.route('/repeater_node', methods=['GET', 'POST'])
def create_repeater_node():
    repeater_node_content = request.json
    global repeater_node
    if repeater_node_content['Transport Protocol'] == 'UDP' or repeater_node_content['Transport Protocol'] == 'udp':
        transport_protocol = TransportProtocol_udp
    elif repeater_node_content['Transport Protocol'] == 'TCP' or repeater_node_content['Transport Protocol'] == 'tcp': 
        transport_protocol = TransportProtocol_tcp
    else:
        return jsonify({'Error': 'Transport Protocol not supported'})
    try:
        adress = Address(
            ip = repeater_node_content['IP Address'],
            port = repeater_node_content['Address Port'],
            external_port = repeater_node_content['Address Port'],
            transport_protocol = transport_protocol
        )

        repeater_node = RepeaterNode(
            name=repeater_node_content['Name'],
            listening_addresses=[adress]
        )

        return jsonify({'message': 'OK'})
    
    except Exception as e:
        print(f'There has been an error while trying to create the Repeater Node {e}')
        return jsonify({'Error': f'There has been an error while trying to create the Repeater Node {e}'})

# ------------ Stop and Delete repeater node ----------------

@app.route('/repeater_node/stop', methods=['GET', 'POST'])
def stop_repeater_node():
    global repeater_node
    try:
        del repeater_node
        return jsonify({'message': 'OK'})
    except Exception as e:
        print(f'There has been an error while trying to stop the Repeater Node {e}')
        return jsonify({'Error': f'There has been an error while trying to stop the Repeater Node {e}'})

if __name__ == "__main__":

    app.run(host= '0.0.0.0', port=5000)
