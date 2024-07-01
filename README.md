# AML-Dashboard


## Installation

To get started with AML-Dashboard, follow these steps.

Clone this repository using the following command:

```bash
git clone https://github.com/eProsima-Private/AML-Dashboard.git
```

### Dependencies

#### Building from sources

If **AML-IP** is not already installed in your system, follow one of the methods outlined in its [documentation site](https://aml-ip.readthedocs.io/en/latest/rst/developer_manual/installation/sources/linux/linux.html).


#### Docker

Alternatively, you can use the **AML-IP Docker** image with all dependencies pre-installed.

Here's how you can build the Docker image from the provided [Dockerfile](https://github.com/eProsima-Private/AML-Dashboard/blob/feature/dfki_demo_amlip/Dockerfile). Simply execute the following command from the top-level directory:

```bash
docker build -t amlip --no-cache -f Dockerfile .
```

### Requirements

Before proceeding further, ensure that you have **npm** (8.5.1) and **nodejs** (v12.22.9) installed on your system. If not, install them using the following commands:

```bash
sudo apt install -y npm nodejs
```

Verify the installed versions using:

```bash
npm -v
node -v
```

Finally, navigate to the [`frontend/aml_dashboard`](https://github.com/eProsima-Private/AML-Dashboard/blob/feature/dfki_demo_amlip/frontend/aml_dashboard) directory and install the frontend dependencies:

```bash
cd frontend/aml_dashboard
npm i
```

By following these steps, you'll have AML-Dashboard up and running, equipped with all the necessary components and dependencies.


## Execution

### Backend Server

To run the AML-IP nodes and the backend server, follow the steps below:

**Run the server**

1. Load the AML-IP environment

	```bash
	source /AML-IP/install/setup.bash
	```

2. Start the [server](https://github.com/eProsima-Private/AML-Dashboard/blob/feature/dfki_demo_amlip/backend/server.py)

	```bash
	python3 server.py
	```

**Run AML-IP nodes**

Depending on your requirements, you can run different types of AML-IP nodes:

* **Run a Computing Node**

	1. Load the AML-IP environment

		```bash
		source /AML-IP/install/setup.bash
		```

	2. Start the [Computing Node](https://github.com/eProsima-Private/AML-Dashboard/blob/feature/dfki_demo_amlip/backend/computing.py)

		```bash
		python3 computing.py
		```

	You can run multiple computing nodes simultaneously. Each computing node will continuously await job assignments. When running multiple nodes, they will collectively distribute the workload, optimizing the time to find a solution.

	To stop a computing node, simply run `ctrl+C`.

* **Run a Model Manager Sender Node**

	1. Load the AML-IP environment

		```bash
		source /AML-IP/install/setup.bash
		```

	2. Start the [Model Manager Sender Node](https://github.com/eProsima-Private/AML-Dashboard/blob/feature/dfki_demo_amlip/backend/sender.py)

		```bash
		python3 sender.py
		```

	To stop a model manager sender node, simply run `ctrl+C`.

* **Run an Inference Node**

	1. Load the AML-IP environment

		```bash
		source /AML-IP/install/setup.bash
		```

	2. Start the [Inference Node](https://github.com/eProsima-Private/AML-Dashboard/blob/feature/dfki_demo_amlip/backend/inference.py)

		```bash
		python3 inference.py
		```

	To stop an inference node, simply run `ctrl+C`.

### Frontend Marcelle Framework

To run the frontend Marcelle framework, follow the steps below:

**Launch the dashboard**

1. Navigate to the [*frontend/aml_dashboard*](https://github.com/eProsima-Private/AML-Dashboard/blob/feature/dfki_demo_amlip/frontend/aml_dashboard) directory

	```bash
	cd frontend/aml_dashboard
	```

2. Run the dashboard

	```bash
	npm run dev
	```

With these steps completed, you're all set to utilize the AML-Dashboard, seamlessly integrating backend server functionalities with the Marcelle framework frontend.


## Usage

With the AML-Dashboard up and running, you can access it at the following address:

```bash
http://localhost:5173/
```

### Data Management Tab

Efficiently manage and create new datasets.

To create a dataset, simply follow these steps:

1. Activate the `video` switch in the *webcam* section to enable webcam capture.
2. Specify the label of the dataset in the *Instance label* section.
3. Click on the `Hold to record instances` button in the *Capture instances to the training set* to start recording instances.
4. Once recorded, the dataset will be promptly displayed in the *dataset browser* section for easy access and management.

### Training Tab

Effortlessly train models using either AML or Neural Network.

To train a model using AML, follow these steps:

1. Specify the number of parallel trainings (executions) you wish to run.
2. Define the number of iterations per execution.
3. Set the percentage of dataset to distribute in each execution.
4. Click on the `Train` button in the *AML Training Launcher* to initiate the training process.
5. Once the training is completed, the model status will appear as **Finished :)** in the *AML Status*.

* Please ensure that at least one **Computing Node** is running to facilitate the training process.

### Fetching Tab

Retrieve trained AML Models effortlessly.

To fetch a model, follow these steps:

1. Click on the `Search for statistics` button in the *AML Statistics Fetcher*.
2. Once the statistics are received, the status will appear as **Statistics received !** in the *AML Collaborative Learning Status*.
3. Click on the `Request model` button in the *AML Model Fetcher*.
4. Once the model is received, the status will change to **Model received !** in the *AML Collaborative Learning Status*.

* Make sure that at least one **Model Manager Sender Node** is running to facilitate the model fetching process.

### Batch Prediction Tab

Effortlessly predict the output of a batch of inputs using an AML Model.

To predict the output of a dataset, follow these steps:

1. Click on the `Update predictions` button in the *Algebraic Machine Learning*.
2. The predictions will be displayed in the *Results Algebraic Machine Learning* plot.

* Ensure that you have access to at least one AML Model to facilitate the batch prediction process.

### Real-Time Prediction Tab

Experience real-time image prediction, utilizing either an AML Model or a Neural Network.

To predict the output of webcam images in real-time using an AML Model, follow these steps:

1. Toggle the `prediction` switch in the *Predict for AML* section and activate the `video` switch in the *webcam* section.
2. The predictions will be displayed in the *Results AML* plot.

* Ensure that you have access to at least one AML Model to facilitate the real-time prediction process.

### Status Tab

Get a detailed overview of the currently active AML-IP nodes within the network.

Here's what it entails:

* **[ID](https://aml-ip.readthedocs.io/en/latest/rst/user_manual/nodes/nodes.html#node-id)**: Each node in the network has a unique Id. This Id is generated by combining the node's name with a randomly generated number, ensuring its uniqueness.
* **[State](https://aml-ip.readthedocs.io/en/latest/rst/user_manual/nodes/nodes.html#node-state)**: This indicates the current operational status of each node, providing valuable insights into their functionality.
* **[Kind](https://aml-ip.readthedocs.io/en/latest/rst/user_manual/nodes/nodes.html#node-kind)**: Every node is categorized into a specific kind, defining their behavior and role within the network. There are no restrictions on the number of nodes of the same kind that can operate concurrently within the network.

The status tab automatically refreshes every second, ensuring you receive real-time updates and information about the network's status.
