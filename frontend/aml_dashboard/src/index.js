import '@marcellejs/core/dist/marcelle.css';
import {
  batchPrediction,
  button,
  confidencePlot,
  confusionMatrix,
  dashboard,
  dataset,
  datasetBrowser,
  datasetTable,
  dataStore,
  fileUpload,
  imageDisplay,
  imageUpload,
  mlpClassifier,
  modelParameters,
  number,
  Stream,
  text,
  textInput,
  throwError,
  toggle,
  trainingPlot,
  trainingProgress,
  webcam
} from '@marcellejs/core';


import '@tensorflow-models/hand-pose-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { dropout } from '@tensorflow/tfjs-core';

const model_hand = handPoseDetection.SupportedModels.MediaPipeHands;
const detectorConfig = {
  runtime: 'tfjs', // or 'tfjs'
  modelType: 'full', // 'full' or 'lite'
  maxHands : 1 // could be 2 too.
};

const detector = await handPoseDetection.createDetector(model_hand, detectorConfig);

function save_to_file(data, filename) {
  const jsonString = JSON.stringify(data);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}


// -----------------------------------------------------------
// INPUT PIPELINE & DATA CAPTURE
// -----------------------------------------------------------

const input = webcam({period : 30});

const label = textInput();
label.title = 'Instance label';
const capture = button('Hold to record instances');
capture.title = 'Capture instances to the training set';

const store = dataStore('localStorage');
const trainingSet = dataset('training-set-dashboard', store);
const trainingSetBrowser = datasetBrowser(trainingSet);

function generateRedBlob(imageData, startX, startY) {
  // Get the pixel data from the ImageData object
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Loop through a 7x7 area centered at (startX, startY)
  for (let x = startX - 3; x <= startX + 3; x++) {
    for (let y = startY - 3; y <= startY + 3; y++) {
      // Check if the current coordinates are within the image bounds
      if (x >= 0 && x < width && y >= 0 && y < height) {
        // Calculate the index for the current pixel
        const index = (y * width + x) * 4;

        // Set the RGB values for the pixel to red
        data[index] = 255;   // Red
        data[index + 1] = 0; // Green (set to 0)
        data[index + 2] = 0; // Blue (set to 0)
        data[index + 3] = 255; // Alpha (fully opaque)
      }
    }
  }
  // Update the ImageData with the modified pixels
  return imageData;
}

async function get_features(img) {
  const hands = await detector.estimateHands(img);
  var x = [];
  if (hands.length > 0) {
    const finger = hands[0].keypoints[8];
    const finger3D = hands[0].keypoints3D[8];

    const fingerHand3D = hands[0].keypoints3D[5];

    x = [finger.x, finger.y,
        finger3D.x - fingerHand3D.x,
        finger3D.y - fingerHand3D.y,
        finger3D.z - fingerHand3D.z];

  } else {
    x = [0.0, 0.0, 0.0, 0.0, 0.0];
  }
  return x;
}

const hand_stream = input.$images
  .map(async (img) => ({
    x : await get_features(img),
    thumbnail : img,
    y: label.$value.get(),
})).awaitPromises();

const hand_window = hand_stream.loop((values, x) => {
  values.push(x)
  values = values.slice(-10) // Keep up to 10 most recent
  return { seed: values, value: values }
}, [], hand_stream);

function calculate_time_features(arr) {
  var img = arr[0].thumbnail;
  const lbl = arr[arr.length-1].y;
  const feats_per_t = 5;
  const normal_seq_len = 10;
  const feats = new Array(feats_per_t * normal_seq_len).fill(0.0);
  for (let t = 0; t < arr.length; t++) {
    const m = arr[t];
    if (m.x.length > 0) {
      img = generateRedBlob(img, Math.floor(m.x[0]), Math.floor(m.x[1]) );
      for(let f=0; f < m.x.length; f++) {
        feats[feats_per_t*t + f] = m.x[f];
      }
    }
  }
  // Draw the path.
  return {x : feats, thumbnail : img, y: lbl};
}

const vis_detection = hand_stream.map( async (v) => (generateRedBlob(v.thumbnail,  Math.floor(v.x[0]), Math.floor(v.x[1]))) ).awaitPromises();
const instanceViewer = imageDisplay(vis_detection);

hand_window
  .filter(() => capture.$pressed.get())
  .map(async (arr) => (calculate_time_features(arr)))
  .awaitPromises()
  .subscribe(trainingSet.create);


// -----------------------------------------------------------
// TRAINING
// -----------------------------------------------------------

const b = button('Train');
b.title = 'Neural Network Training Launcher';
const classifier = mlpClassifier({ layers: [64, 32], epochs: 20 }).sync(store, 'mlp-dashboard');

b.$click.subscribe(() => classifier.train(trainingSet));

const url_train = "http://localhost:5000/train/";
const aml_model = { "ready" : false};

const b_train_AML = button('Train');
b_train_AML.title = 'AML Training Launcher'

const textAMLTrainStatus = text('Not Trained');
textAMLTrainStatus.title = 'AML Status';

const n_jobs = number(1);
n_jobs.title = 'Parallel Training (executions)';

const features = {
  parameters: {
    'Iterations': new Stream(10, true),
    'Percentage of data': new Stream(20, true),
  },
};

const controls = modelParameters(features);
controls.title = 'Choose input values per execution';

console.log('Controls:', controls);

b_train_AML.$click.subscribe( async () => {
  textAMLTrainStatus.$value.set(' <h1>Training...</h1> <br> <img src="https://i.gifer.com/origin/05/05bd96100762b05b616fb2a6e5c223b4_w200.gif">');

  const v = await trainingSet.find();

  // TODO: save the training set to a file each time is updated
  save_to_file(v, "training_set_.json"); // Save the training set to a file

  const json_dt = {x : [], y : []};
  const dt = v.data;
  for(let i = 0; i < dt.length; i++) {
    json_dt.x.push(dt[i].x);
    json_dt.y.push(dt[i].y);
  }

  const n_job = n_jobs.$value.get().toString();
  const n_iter = features_values[0].value.toString();
  const percentage_data = features_values[1].value.toString();

  fetch(url_train + n_job + '/' + n_iter + '/' + percentage_data, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "omit", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(json_dt), // body data type must match "Content-Type" header
  })
  .then(response => response.json())
  .then(async json => {
    console.log(json);
    console.log('RECEIVED');

    save_to_file(json, "model_.json");

    aml_model['ready'] = true;

    textAMLTrainStatus.$value.set('<h1>Finished :)</h1> ');

  });
});

const params = modelParameters(classifier);
const prog = trainingProgress(classifier);
const plotTraining = trainingPlot(classifier);


// -----------------------------------------------------------
// FETCHING
// ----------------------------------------------------------

const url_fetcher = "http://localhost:5000/fetcher/";

const statistics_received = text('No statistics received');
statistics_received.title = 'AML Statistics';

const model_received = text('No model received');
model_received.title = 'AML Model';

const collaborative_status = text('Not received');
collaborative_status.title = 'AML Collaborative Learning Status';

const search_statistics = button('Search for statistics');
search_statistics.title = 'AML Statistics Fetcher'

search_statistics.$click.subscribe( async () => {
  console.log('Search statistics');
  collaborative_status.$value.set(' <h1>Searching statistics...</h1> <br> <img src="https://i.gifer.com/Cad.gif"> ');

  fetch(url_fetcher + 'statistics', {
    method: "GET", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "omit", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
  })
  .then(response => response.json())
  .then(async json => {
    console.log(json);
    console.log('STATISTICS RECEIVED');

    const name = json.name; // Extracting the value of 'name' field from the JSON response

    collaborative_status.$value.set('<h1>Statistics received !</h1> ');
    statistics_received.$value.set('<h2>Statistics received: ' + name + '</h2>');

  });

});

const request_model = button('Request model');
request_model.title = 'AML Model Fetcher'

request_model.$click.subscribe( async () => {

  if (statistics_received.$value.get() == 'No statistics received') {
    throwError(new Error('No statistics have been received'));
  } else {

    console.log('Request model');
    collaborative_status.$value.set(' <h1>Requesting model...</h1> <br> <img src="https://i.gifer.com/Cad.gif">');

    const v = await trainingSet.find();

    // TODO: save the training set to a file each time is updated
    save_to_file(v, "training_set_.json"); // Save the training set to a file

    fetch(url_fetcher + 'model', {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "omit", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    })
    .then(response => response.json())
    .then(async json => {
      console.log(json);
      console.log('MODEL RECEIVED');

      save_to_file(json, "model_.json");

      aml_model['ready'] = true;

      collaborative_status.$value.set('<h1>Model received !</h1> ');
      model_received.$value.set('<h2>Model received</h2>');

    })
  }
})


// -----------------------------------------------------------
// BATCH PREDICTION
// -----------------------------------------------------------

const batchMLP = batchPrediction('mlp', store);
const confMat = confusionMatrix(batchMLP);
confMat.title = 'Results Neural Network'

const predictButton = button('Update predictions');
predictButton.title = 'Neural Network';

predictButton.$click.subscribe(async () => {
  if (!classifier.ready) {
    throwError(new Error('No classifier has been trained'));
  }
  await batchMLP.clear();
  await batchMLP.predict(classifier, trainingSet);
});

// FOR AML
const url_inference = "http://localhost:5000/inference";

const predictButtonAML = button('Update predictions');
predictButtonAML.title = 'Algebraic Machine Learning';

const batchAML = batchPrediction('AML', store);
const confMatAML = confusionMatrix(batchAML);
confMatAML.title = 'Results Algebraic Machine Learning'
const mockAMLModel = {
  predict : function predict(x) {
    const json_dt = {data : x};

    return fetch(url_inference, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "omit", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(json_dt), // body data type must match "Content-Type" header
    })
    .then(response => response.json())
    .then(async json => {
      console.log(json);
      console.log('PREDICTION RECEIVED');

      return json;
    });
  }
};

predictButtonAML.$click.subscribe(async () => {
  if (! aml_model['ready']) {
    throwError(new Error('No AML model has been trained'));
  }

  await batchAML.clear();
  await batchAML.predict(mockAMLModel, trainingSet);

  console.log('Predictions done');
  console.log(batchAML.items().service);
});


// -----------------------------------------------------------
// REAL-TIME PREDICTION
// -----------------------------------------------------------

const togNN = toggle('toggle prediction');
togNN.title = 'Predict for NN';
togNN.$checked.subscribe((checked) => {
  if (checked && !classifier.ready) {
    throwError(new Error('No classifier has been trained'));
    setTimeout(() => {
      tog.$checked.set(false);
    }, 500);
  }
});

const togAML = toggle('toggle prediction');
togAML.title = 'Predict for AML';
togAML.$checked.subscribe((checked) => {
  if (checked && !aml_model['ready']) {
    throwError(new Error('No AML model has been trained'));
    setTimeout(() => {
      togAML.$checked.set(false);
    }, 500);
  }
});

const predictionStreamNN = hand_window
  .filter(() => togNN.$checked.get() && classifier.ready)
  .map(async (arr) => classifier.predict(calculate_time_features(arr).x))
  .awaitPromises();

const predictionStreamAML = hand_window
  .filter(() => togAML.$checked.get() && aml_model['ready'])
  .map(async (arr) => {

    // Prepare the data for the AML model
    const json_dt = {data : calculate_time_features(arr).x};

    // Predict using the AML model
    console.log('Predicting using AML model');

    return fetch(url_inference, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "omit", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(json_dt), // body data type must match "Content-Type" header
    })
    .then(response => response.json())
    .then(async json => {
      console.log(json);
      console.log('INFERENCE RECEIVED');

      return json;
    });
  })
  .awaitPromises();

const plotResultsNN = confidencePlot(predictionStreamNN);
plotResultsNN.title = 'Results Neural Network';

const plotResultsAML = confidencePlot(predictionStreamAML);
plotResultsAML.title = 'Results AML';


// -----------------------------------------------------------
// INSTANCE VIEWER
// -----------------------------------------------------------

const create_fiware = button('Create');
create_fiware.title = 'Fiware Node';

// Configure the parameters for the Fiware Node
const fiware_params = {
  parameters: {
    'Name': new Stream('MyFiwareNode', true),
    'Domain': new Stream(0, true),
    'Server IP': new Stream('192.168.1.51', true),
    'Server Port': new Stream(1028, true),
    'Context Broker IP': new Stream('localhost', true),
    'Context Broker Port': new Stream(1026, true),
    'Entity ID': new Stream('urn:ngsi-ld:Device:001', true),
    'Attribute Data': new Stream('Data', true),
    'Attribute Solution': new Stream('Inference', true),
  },
};

const fiware_node = modelParameters(fiware_params);
fiware_node.title = 'Choose parameters for the Fiware Node creation:';

const fiware_node_status = text('Not Created');
fiware_node_status.title = 'Fiware Node Status';

const post_data = button('Post Data');
post_data.title = 'Context Broker Data';

const upload_data = imageUpload();
upload_data.title = 'Upload data to the Context Broker';

const data_status = text('Not Sended');
data_status.title = 'Data Status';

const get_solution = text('{}');
get_solution.title = 'Context Broker Solution';

const solution_status = text('Not Received');
solution_status.title = 'Solution Status';

let image;

const url_context_broker = "http://localhost:5000/context_broker/";

// Create the Fiware Node
create_fiware.$click.subscribe( async () => {

  fiware_node_status.$value.set(' <h1>Creating...</h1> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in fiware_params.parameters) {
    parameters[param] = fiware_params.parameters[param].value;
  }

  fetch(url_context_broker + 'fiware', {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "omit", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(parameters), // body data type must match "Content-Type" header
  })
  .then(response => response.json())
  .then(async json => {
    console.log(json);
    console.log('CREATED');

    fiware_node_status.$value.set('<h1>Created !</h1> ');

  });
});

// Post the data to the Context Broker
post_data.$click.subscribe( async () => {

  if (upload_data.$images.value == undefined)
  {
    throwError(new Error('No data has been uploaded'));
  }
  else
  {
    data_status.$value.set(' <h1>Sending...</h1> <br> <img src="https://i.gifer.com/Cad.gif">');
    const image_data = Array.from(image.data);

    fetch(url_context_broker + 'data', {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "omit", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify({
        width : 6,
        height : 6,
        data : image_data
      }) // body data type must match "Content-Type" header
    })
    .then(response => response.json())
    .then(async json => {
      console.log('SENDED');

      data_status.$value.set('<h1>Sended !</h1> ');

      solution_status.$value.set('<h1>Waiting for solution...</h1> ');

      // Get the solution from the Context Broker
      fetch(url_context_broker + 'solution', {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "omit", // include, *same-origin, omit
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      })
      .then(response => response.json())
      .then(async json => {
        console.log(json);
        console.log('SOLUTION RECEIVED');

        var solution_attr = fiware_params.parameters['Attribute Solution'].value;
        var solution = json[solution_attr];

        var solution_string = JSON.stringify(solution, null, 4);
        console.log(solution_string);

        get_solution.$value.set(`<pre>${solution_string}</pre>`);

        solution_status.$value.set('<h1>Solution received !</h1> ');

      });
    });
  }
});

// Upload the data that will be sent to the Context Broker
upload_data.$images.subscribe( async (img) => {

  image = img;
  data_status.$value.set(' <h1>Image uploaded</h1> ');
});


// -----------------------------------------------------------
// STATUS
// -----------------------------------------------------------

// Define data store using localStorage
export const store2 = dataStore('localStorage');
// Create dataset named 'aml-ip state' using the defined store2
export const ts = dataset('aml-ip state', store2);
// Create dataset table for the 'ts' dataset with specified columns
export const tst = datasetTable(ts, [
  'ID',
  'State',
  'Kind',
]);

// Setup and clear the dataset
await ts.setup();
await ts.clear();

// Define the URL for fetching status
const url_status = "http://localhost:5000/status";

// Function to fetch the status
function fetchStatus() {
  fetch(url_status, {
    method: "GET", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "omit", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
  })
  .then(response => response.json())
  .then(async json => {

  // Update instances in the dataset
  async function updateInstances(ts) {
    var instances = await ts
      .items() // get iterable
      .select(['_id', 'ID']) // select the fields toy return
      .toArray(); // convert to array
    return instances;
  }

  // Check if ID is in instances
  function isRepeated(instances, ID) {
    for (var i in instances) {
      if (ID == instances[i].ID) {
        return true;
      }
    }
    return false;
  }

  // Function to get the id in the dataset based on ID
  function getId(instances, ID) {
    for (var i in instances) {
      if (ID == instances[i].ID) {
        return instances[i].id;
      }
    }
  }

  // Function to remove status from dataset
  function removeStatus(dataset, instances, ID) {
    var local_id = getId(instances, ID);
    dataset.remove(local_id);
  }

  var instances = await updateInstances(ts)

  const nodes = json['nodes'];

  for (var node in nodes) {

    instances = await updateInstances(ts)
    // Get ID of the current node
    const id = json['nodes'][node].ID;

    // Check if ID is repeated, if so remove status
    if (isRepeated(instances, id)) {
      // Remove the status of the nodes that are not in the dataset
      removeStatus(ts, instances, id);
    }
    // Create node in the dataset
    ts.create(nodes[node]);

    instances = await updateInstances(ts)
  }
  });
}
// Fetch the status every 1 seconds
setInterval(fetchStatus, 1000); // 1000 milliseconds = 1 seconds


// -----------------------------------------------------------
// DASHBOARDS
// -----------------------------------------------------------

const dash = dashboard({
  title: 'AML Explorer',
  author: 'DFKI - INRIA - EPROSIMA',
});

dash
  .page('Data Management')
  .sidebar(input, instanceViewer)
  .use([label, capture], trainingSetBrowser);
dash.page('Training').sidebar(b_train_AML, n_jobs, controls, textAMLTrainStatus).use(b, params, prog, plotTraining);
dash.page('Fetching').sidebar(collaborative_status).use(search_statistics, statistics_received, request_model, model_received);
dash.page('Batch Prediction').use( [predictButtonAML, confMatAML], [predictButton, confMat]);
dash.page('Real-time Prediction').sidebar(togAML, togNN, input).use([plotResultsNN, plotResultsAML]);
dash.page('Context broker').sidebar(create_fiware, fiware_node, fiware_node_status).use(post_data, upload_data, data_status, get_solution, solution_status);
dash.page('Status').use(tst);
dash.settings.dataStores(store, store2).datasets(trainingSet).models(classifier).predictions(batchMLP);

dash.show();
