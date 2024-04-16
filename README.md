# Backend Server

1. **Build the docker image**

	This image is installed with AML-IP and is able to run AML-IP nodes.

	```bash
	docker build -t amlip --no-cache -f Dockerfile .
	```

2.	**Run the server**

	2.1. Run the docker image

	```bash
	docker run --rm -it --net=host --ipc=host amlip
	```

	2.2. Load the AML-IP environment

	```bash
	source /AML-IP/install/setup.bash
	```

	2.3. Start the server

	```bash
	python3 server.py
	```

	Inside `server.py`, you can specify the number of jobs (`n_jobs`) to be distributed among one or more computing nodes, along with the iterations within each job. For instance, if you have two jobs, each job will handle half of the iterations. The resulting models from both jobs will be combined into a comprehensive model.


3.	**Run a Computing Node**

	3.1. Run the docker image

	```bash
	docker run --rm -it --net=host --ipc=host amlip
	```

	3.2. Load the AML-IP environment

	```bash
	source /AML-IP/install/setup.bash
	```

	3.3. Start the Computing Node

	```bash
	python3 computing.py
	```

	You can run multiple computing nodes simultaneously. Each computing node will continuously await job assignments. When running multiple nodes, they will collectively distribute the workload, optimizing the time to find a solution.

	To stop a computing node, simply run `ctrl+C`.

# Frontend Marcelle Framework

1.	**Install dependencies**

	1.1. Install npm (8.5.1) and nodejs (v12.22.9)

	```bash
	sudo apt install -y npm nodejs
	```

	1.2. Check installed versions

	```bash
	npm -v
	node -v
	```

2.	**Launch dashboard**

	2.1. Navigate to the *frontend/inria_dashboard* Directory

	```bash
	cd frontend/inria_dashboard
	```

	2.2. Run the dashboard

	```bash
	npm run dev
	```
