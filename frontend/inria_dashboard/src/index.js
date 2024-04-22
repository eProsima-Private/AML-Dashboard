import '@marcellejs/core/dist/marcelle.css';
import {
  batchPrediction,
  datasetBrowser,
  button,
  text,
  confusionMatrix,
  dashboard,
  fileUpload,
  dataset,
  dataStore,
  datasetTable,
  mlpClassifier,
  number,
  modelParameters,
  confidencePlot,
  Stream,
  trainingProgress,
  textInput,
  toggle,
  trainingPlot,
  webcam,
  throwError,
  imageDisplay
} from '@marcellejs/core';


import '@tensorflow-models/hand-pose-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';

const model_hand = handPoseDetection.SupportedModels.MediaPipeHands;
const detectorConfig = {
  runtime: 'tfjs', // or 'tfjs'
  modelType: 'full', // 'full' or 'lite'
  maxHands : 1 // could be 2 too.
};

const detector = await handPoseDetection.createDetector(model_hand, detectorConfig);

/**
 * @brief Processes model data to compute prediction probabilities.
 *
 * This function takes in the JSON data representing a machine learning model
 * and the training set data to compute prediction probabilities based on the
 * model's characteristics and the training set. It calculates the cumulative
 * misses for the negatives, probability per miss per class, and constructs
 * a prediction function based on the computed probabilities.
 *
 * @param {Object} json - The JSON data representing the machine learning model.
 * @param {Object} trainingSet - The training set data used for model training.
 *
 * @returns {Function} - A prediction function based on the processed model data.
 */
async function process_model_data(json, trainingSet) {
  const n_misses_per_class = build_aml_model(json);

  const map_neg_misses_per_class = {};
  for (let cl in json['classes']) {
    map_neg_misses_per_class[cl] = new Map();
  }

  const v = await trainingSet.find();
  const dt = v.data;

  for (let i = 0; i < dt.length; i++) {
    const map_curr_misses = n_misses_per_class(dt[i].x);
    for (let cl in map_curr_misses) {
      if (cl != dt[i].y) {
        const m = map_curr_misses[cl];
        if (map_neg_misses_per_class[cl][m] != undefined) {
          map_neg_misses_per_class[cl][m] += 1;
        } else {
          map_neg_misses_per_class[cl][m] = 1;
        }
      }
    }
  }

  console.log('finished cumulatives!');

  const map_p_per_miss_per_class = {};
  for (let cl in json['classes']) {
    const max_misses = json['classes'][cl][1].length;
    const lst_cum = [];
    let sum_misses = 0;
    for (let i_n_misses = 0; i_n_misses < max_misses; i_n_misses++) {
      if (map_neg_misses_per_class[cl][i_n_misses] != undefined) {
        const n_times = map_neg_misses_per_class[cl][i_n_misses];
        sum_misses += i_n_misses * n_times;
      }
      lst_cum.push(sum_misses);
    }
    for (let i_n_misses = 0; i_n_misses < max_misses; i_n_misses++) {
      lst_cum[i_n_misses] = 1.0 - (lst_cum[i_n_misses] / sum_misses);
    }
    map_p_per_miss_per_class[cl] = lst_cum;
  }

  console.log(map_p_per_miss_per_class);

  function aml_model_predict(x_raw) {
    const map_misses = n_misses_per_class(x_raw);
    let selected_class;
    let best_prob = 0.0;

    let total_prob = 0.0;
    const map_probs = {};
    for (let cl_nm in map_misses) {
      const n_misses_cl = map_misses[cl_nm];
      let p_for_class = map_p_per_miss_per_class[cl_nm][n_misses_cl];
      if (p_for_class == undefined) {
        p_for_class = 0.0;
      }

      map_probs[cl_nm] = p_for_class;
      total_prob = total_prob + p_for_class;
      if (p_for_class >= best_prob) {
        selected_class = cl_nm;
        best_prob = p_for_class;
      }
    }

    const map_confs = {};
    const e = 0.00000001;
    total_prob += e * Object.keys(map_probs).length;
    for (let cl_nm in map_probs) {
      map_confs[cl_nm] = (map_probs[cl_nm] + e) / total_prob;
    }

    return { 'label': selected_class, 'confidences': map_confs };
  }

  return aml_model_predict;
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

function setPixelToRed(imageData, x, y) {
  // Get the pixel data from the ImageData object
  const data = imageData.data;

  // Calculate the index for the pixel at the specified (x, y) coordinates
  const index = (y * imageData.width + x) * 4;

  // Set the RGB values for the pixel to red
  data[index] = 255;   // Red
  data[index + 1] = 0; // Green (set to 0)
  data[index + 2] = 0; // Blue (set to 0)
  data[index + 3] = 255; // Alpha (fully opaque)

  // Update the ImageData with the modified pixel
  return imageData;
}

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

const features = ['Iterations', 'Percentage of data'];
const features_values = [
  { value: 10, unit: '' },
  { value: 20, unit: '' }
];

// Create the parameters object with Stream instances for each feature with each initial values
const parameters = Object.fromEntries(
  features.map((feature, index) => [feature, new Stream(features_values[index].value, true)])
);

const controls = modelParameters({ parameters });
controls.title = 'Choose input values per execution';

b_train_AML.$click.subscribe( async () => {
  console.log('train');
  textAMLTrainStatus.$value.set(' <h1>Training...</h1> <br> <img src="https://i.gifer.com/origin/05/05bd96100762b05b616fb2a6e5c223b4_w200.gif">');


  const v = await trainingSet.find();
  const json_dt = {x : [], y : []};
  const dt = v.data;
  for(let i = 0; i < dt.length; i++) {
    json_dt.x.push(dt[i].x);
    json_dt.y.push(dt[i].y);
  }

  const n_job = n_jobs.$value.get().toString();
  const n_iter = features_values[0].value.toString();
  const percentage_data = features_values[1].value.toString();

  console.log(json_dt);
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

    const aml_model_predict = await process_model_data(json, trainingSet);

    console.log('AML model built!');

    aml_model['model'] = aml_model_predict;
    aml_model['ready'] = true;

    textAMLTrainStatus.$value.set('<h1>Finished :)</h1> ');

  });
});

function build_aml_model(json_info) {

  const map_atoms = {}
  for (let cl_nm  in json_info['classes']) {
    const lst_atoms_sets = []
    const atoms = json_info['classes'][cl_nm][1];
    for (let atom_i=0; atom_i < atoms.length; atom_i++) {
      const set_atom = new Set(atoms[atom_i]);
      lst_atoms_sets.push(set_atom);
    }
    map_atoms[cl_nm] = {'inputs' : json_info['classes'][cl_nm][0], 'atoms' : lst_atoms_sets};
  }

  function get_input_indexes(x_raw) {
    const input_indexes = [];
    for(let xi = 0; xi < x_raw.length; xi++) {
      const v = x_raw[xi];
      const edges = json_info['edges'][xi];
      let i = 0;
      while (i < edges.length && v > edges[i]) {
        i++;
      }
      input_indexes.push(i);
    }
    return input_indexes;
  }

  function n_misses_per_class(x_raw) {
    const indexes = get_input_indexes(x_raw);
    const map_misses = {};
    for (let cl_nm in map_atoms) {
      let my_input_consts = new Set();
      const consts_here = map_atoms[cl_nm]['inputs'];
      for (let fi = 0; fi < consts_here.length; fi++) {
        my_input_consts.add(consts_here[fi][indexes[fi]]);
      }
      let n_misses = 0;
      const atoms_of_class = map_atoms[cl_nm]['atoms'];
      for(let atom_i=0; atom_i < atoms_of_class.length; atom_i++) {
        const atom = atoms_of_class[atom_i];
        let not_found = true;
        for(const elem of my_input_consts) {
          if(atom.has(elem)) {
            not_found = false;
            break;
          }
        }
        if(not_found) {
          n_misses++;
        }
      }
      map_misses[cl_nm] = n_misses
    }
    return map_misses;
  }
  return n_misses_per_class
}

const params = modelParameters(classifier);
const prog = trainingProgress(classifier);
const plotTraining = trainingPlot(classifier);


// -----------------------------------------------------------
// UPLOADING (TODO)
// -----------------------------------------------------------

const model_uploaded = text('No model loaded');
model_uploaded.title = 'AML Local Model';

const b_upload_AML = fileUpload();
b_upload_AML.title = 'AML upload model file'

b_upload_AML.$files.subscribe( async (fl) => {

  console.log(fl[0]);
  const json = {};

  console.log(json);
  console.log('MODEL UPLOADED');

  model_uploaded.$value.set('<h1>Model uploaded !</h1> ');

});


// -----------------------------------------------------------
// FETCHING
// ----------------------------------------------------------

const url_fetcher = "http://localhost:5000/fetcher/";

const statistics_received = text('No statistics received');
statistics_received.title = 'AML Collaborative Statistics';

const model_received = text('No model received');
model_received.title = 'AML Collaborative Model';

const collaborative_status = text('Not received');
collaborative_status.title = 'AML Collaborative Status';

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

      const aml_model_predict = await process_model_data(json, trainingSet);

      aml_model['model'] = aml_model_predict;
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
const predictButtonAML = button('Update predictions');
predictButtonAML.title = 'Algebraic Machine Learning';

const batchAML = batchPrediction('AML', store);
const confMatAML = confusionMatrix(batchAML);
confMatAML.title = 'Results Algebraic Machine Learning'
const mockAMLModel = {predict : function predict(x) { return aml_model['model'](x);  } }

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
  .map(async (arr) => aml_model['model'](calculate_time_features(arr).x))
  .awaitPromises();

const plotResultsNN = confidencePlot(predictionStreamNN);
plotResultsNN.title = 'Results Neural Network';
const plotResultsAML = confidencePlot(predictionStreamAML);
plotResultsAML.title = 'Results AML';


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

  console.log(json);
  console.log('STATUS RECEIVED');

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
  author: 'DFKI - INRIA',
});

dash
  .page('Data Management')
  .sidebar(input, instanceViewer) //featureExtractor)
  .use([label, capture], trainingSetBrowser);
dash.page('Training').sidebar(b_train_AML, n_jobs, controls, textAMLTrainStatus).use(b, params, prog, plotTraining);
dash.page('Uploading').sidebar(model_uploaded).use(b_upload_AML);
dash.page('Fetching').sidebar(collaborative_status).use(search_statistics, statistics_received, request_model, model_received);
dash.page('Batch Prediction').use( [predictButtonAML, confMatAML], [predictButton, confMat]);
dash.page('Real-time Prediction').sidebar(togAML, togNN, input).use([plotResultsNN, plotResultsAML]);
dash.page('Status').use(tst);
dash.settings.dataStores(store, store2).datasets(trainingSet).models(classifier).predictions(batchMLP);

dash.show();
