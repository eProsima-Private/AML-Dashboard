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
  select,
  Stream,
  text,
  textInput,
  throwError,
  toggle,
  trainingPlot,
  trainingProgress,
  webcam
} from '@marcellejs/core';

import { widget } from './components';
import { showCustomModal, showCustomAlert, showPopupFileUpload } from './components/popup/popup';
import '@tensorflow-models/hand-pose-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from "@tensorflow/tfjs";

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
const trainingSet2 = dataset('training2-set-models', store);
const trainingSet3 = dataset('training3-set-models', store);

const model_storage = dataset('model-storage', store);

function get_last_selected_datatset() {
  const storedDataset = localStorage.getItem('instances-model-storage');
  if (storedDataset) {
    const dataset = JSON.parse(storedDataset);
    const firstKey = Object.keys(dataset)[0];
    return dataset[firstKey].model; // Return the model name
  }
  const defaultDataset = 'Sensors';
  return defaultDataset;
}

const choose_model = select(['Sensors', 'MNIST', 'KMNIST', 'MedMNIST', 'Fashion MNIST', 'CIFAR10', 'Custom'], get_last_selected_datatset());
choose_model.title = 'Choose the model for the training set';

const trainingSetBrowser = datasetBrowser(trainingSet);
trainingSetBrowser.title = 'Sensor Training Set';
const trainingSetBrowser2 = datasetBrowser(trainingSet2);
trainingSetBrowser2.title = 'Standard Training Set';

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
// LOAD STANDARD DATASETS
// -----------------------------------------------------------

async function store_model(model) {

  const instance = {
    model: model,
    datasetName: 'model-storage'
  };

  await model_storage.clear();
  await model_storage.create(instance);
}

const url_datasets = "http://localhost:5000/datasets/";

const std_dataset = button('Load dataset');
std_dataset.title = 'Load Dataset';

std_dataset.$click.subscribe(async () => {
  const model = choose_model.$value.get();
  
  if (model === 'Sensors') {
    showCustomAlert();
    store_model(model);
  } else if (model === 'Custom') {
    const fileInput = await showPopupFileUpload();
    if (fileInput != null) {
      let formData = new FormData();
      formData.append("file", fileInput);
      await trainingSet2.clear();
      await trainingSet2.upload([fileInput]);
      fetch(url_datasets + model, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "omit", // include, *same-origin, omit
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: formData, // body data type must match "Content-Type" header
      })
      .then(response => response.json())
      .then(async json => {
        if (json.Error) {
          throwError(new Error(json.Error));
        } else {
          // Save the model name to the local storage
          store_model(model);
        }
      });
    }
  } else {
  fetch(url_datasets + model, {
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
    if (json.Error) {
      throwError(new Error(json.Error));
    } else {
      // Save the model name to the local storage      
      store_model(model);
      // Convert JSON to File object
      const jsonString = JSON.stringify(json);
      const blob = new Blob([jsonString], { type: "application/json" });
      const newFile = new File([blob], `${model}.json`, { type: "application/json" });
  
      await trainingSet2.clear();
      await trainingSet2.upload([newFile]);
    }
    });
  }
});

async function create_binary_dataset(target_class) {
  const json_dt = {instances : []};
  const v = await trainingSet2.find();
  const dt = v.data;

  for(let i = 0; i < dt.length; i++) {
    // Create a new instance object for each item
    const instance = {
      x: dt[i].x,
      y: dt[i].y === target_class ? 'positive' : 'negative',
      thumbnail: dt[i].thumbnail,
      datasetName: 'training3-set-models'
  };
  json_dt.instances.push(instance);
}
  const jsonString = JSON.stringify(json_dt);
  const blob = new Blob([jsonString], { type: "application/json" });
  const newFile = new File([blob], `mnist.json`, { type: "application/json" });

  await trainingSet3.clear();
  await trainingSet3.upload([newFile]);
}

// -----------------------------------------------------------
// TRAINING
// -----------------------------------------------------------

const b = button('Train');
b.title = 'Neural Network Training Launcher';
const classifier = mlpClassifier({ layers: [64, 32], epochs: 20 }).sync(store, 'mlp-dashboard');

const features = {
  parameters: {
    'Iterations': new Stream(10, true),
    'Percentage of data': new Stream(20, true),
    'Target class': new Stream(0, true),
  },
};

b.$click.subscribe(async () =>
  {
  const model = choose_model.$value.get();
  if (model === 'Sensors') {
  classifier.train(trainingSet)
  } else {
    const target_class = features.parameters['Target class'].value;
    await create_binary_dataset(target_class);
    classifier.train(trainingSet3);
  }
}
);

const url_train = "http://localhost:5000/train/";
const aml_model = { "ready" : false};

const b_train_AML = button('Train');
b_train_AML.title = 'AML Training Launcher'

const textAMLTrainStatus = text('Not Trained');
textAMLTrainStatus.title = 'AML Status';

const n_jobs = number(1);
n_jobs.title = 'Parallel Training (executions)';

const controls = modelParameters(features);
controls.title = 'Choose input values per execution';

console.log('Controls:', controls);

const url_atomization = "http://localhost:5000/atomization";
const uploadAtomization = fileUpload();
uploadAtomization.title = 'Upload atomization file';

const atomization_store = dataset('atomization-storage', store);

function store_atomization(atomization) {

  const instance = {
    atomization: atomization,
    datasetName: 'atomization-storage'
  };
  atomization_store.clear();
  atomization_store.create(instance);
}

let atomizationUploaded = false;

function get_last_uploaded_atomization() {
  const storedDataset = localStorage.getItem('instances-atomization-storage');
  if (storedDataset === null) {
    const defaultDataset = text('No file uploaded');
    return defaultDataset;
  }
  if (Object.keys(storedDataset).length != 2) {
    const dataset = JSON.parse(storedDataset);
    const firstKey = Object.keys(dataset)[0];
    const filename = dataset[firstKey].atomization;
    const message = text(filename + ' uploaded');
    atomizationUploaded = true;
    return message // Return the model name
  }
  const defaultDataset = text('No file uploaded');
  return defaultDataset;
}

const fileUploadedStatus = get_last_uploaded_atomization();
fileUploadedStatus.title = 'Atomization Status';

uploadAtomization.$files.subscribe((x) => {
  const FileExtension = /.aml$/;
  const checkFileExtension = x[0].name.match(FileExtension);
  if (checkFileExtension === null) {
    throwError(new Error('Invalid file extension. Please upload a .aml file'));
  } else {
    let formData = new FormData();
    formData.append("file", x[0]);

    fetch(url_atomization, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "omit", // include, *same-origin, omit
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: formData, // body data type must match "Content-Type" header
    })
    .then(response => response.json())
    .then(async json => {
      if (json.Error) {
        throwError(new Error(json.Error));
        fileUploadedStatus.$value.set('<p>Not uploaded</p>');
        atomizationUploaded = false;
      } else {
        store_atomization(x[0].name);
        fileUploadedStatus.$value.set(x[0].name + ' uploaded');
        atomizationUploaded = true;
      }
    });
  }
});

function deleteAtomization() {
  fetch(url_atomization + '/delete', {
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
    if (json.Error) {
      throwError(new Error(json.Error));
    } else {
      atomization_store.clear();
      fileUploadedStatus.$value.set('<p>Not uploaded</p>');
      console.log('Atomization file deleted');
      atomizationUploaded = false;
    }
  });
}

b_train_AML.$click.subscribe( async () => {

  if (atomizationUploaded === true && textAMLTrainStatus.$value.get() === '<h2>Finished training with provided atomization :)</h2> '){
    const userResponse = await showCustomModal();
    if (userResponse === false) {
      deleteAtomization();
      atomizationUploaded = false;
    }
  }

  textAMLTrainStatus.$value.set(' <h2>Training...</h2> <br> <img src="https://i.gifer.com/origin/05/05bd96100762b05b616fb2a6e5c223b4_w200.gif">');

  const model = choose_model.$value.get();
  const n_job = n_jobs.$value.get().toString();
  const n_iter = features.parameters['Iterations'].value;
  const percentage_data = features.parameters['Percentage of data'].value;
  const target_class = features.parameters['Target class'].value;

  const json_dt = {x : [], y : []};
  if (model == 'Sensors') {
    const v = await trainingSet.find();
    
    // TODO: save the training set to a file each time is updated
    save_to_file(v, "training_set_.json"); // Save the training set to a file
    
    const dt = v.data;
    for(let i = 0; i < dt.length; i++) {
      json_dt.x.push(dt[i].x);
      json_dt.y.push(dt[i].y);
    }
  } else {
    await create_binary_dataset(target_class);

    const v = await trainingSet3.find();

    save_to_file(v, "training_set_.json");

    const dt = v.data;
    for(let i = 0; i < dt.length; i++) {
      json_dt.x.push(dt[i].x);
      json_dt.y.push(dt[i].y);
    }
  }

  fetch(url_train + n_job + '/' + n_iter + '/' + percentage_data + '/' + model + '/' + target_class + '/' + atomizationUploaded, {
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
    if (json.Error) {
      throwError(new Error(json.Error));
      textAMLTrainStatus.$value.set('<p>Not Trained</p>');
      aml_model['ready'] = false;

    } else {
      save_to_file(json, "model_.json");
      aml_model['ready'] = true;
      if (atomizationUploaded === true) {
        textAMLTrainStatus.$value.set('<h2>Finished training with provided atomization :)</h2> ');
      } else {
      textAMLTrainStatus.$value.set('<h2>Finished :)</h2> ');
      }
    }
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

const control_value = text('No statistics received');

search_statistics.$click.subscribe( async () => {
  collaborative_status.$value.set(' <h2>Searching statistics...</h2> <br> <img src="https://i.gifer.com/Cad.gif"> ');

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
    if (json.Error) {
      throwError(new Error(json.Error)); 
      collaborative_status.$value.set('<p>Not received</p>');
      control_value.$value.set(json.Error);
    } else {
      const name = json.name; // Extracting the value of 'name' field from the JSON response
      collaborative_status.$value.set('<h2>Statistics received !</h2> ');
      statistics_received.$value.set('<h3>' + name + '</h3>');
      control_value.$value.set('Statistics received');
    }
  });
});

const request_model = button('Request model');
request_model.title = 'AML Model Fetcher'

request_model.$click.subscribe( async () => {

  if (control_value.$value.get() != 'Statistics received') {
    throwError(new Error('No statistics have been received'));
  } else {

    console.log('Request model');
    collaborative_status.$value.set(' <h2>Requesting model...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

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
      if (json.Error) {
        console.log('An error occurred: ', json.Error);
        throwError(new Error(json.Error));
        collaborative_status.$value.set('<h2>Statistics received !</h2> ');
        aml_model['ready'] = false;
      } else {
        save_to_file(json, "model_.json");
        aml_model['ready'] = true;
        collaborative_status.$value.set('<h2>Model received !</h2> ');
        model_received.$value.set('<h2>Model received</h2>');
      }
    })
  }
});


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
  if (choose_model.$value.get() === 'Sensors') {
    batchMLP.clear();
    await batchMLP.predict(classifier, trainingSet);
  } else {
    batchMLP.clear();
    await batchMLP.predict(classifier, trainingSet3);
  }
});

// FOR AML
const url_inference = "http://localhost:5000/inference";

const predictButtonAML = button('Update predictions');
predictButtonAML.title = 'Algebraic Machine Learning';
const batchAML = batchPrediction('AML', store);
const confMatAML = confusionMatrix(batchAML);
confMatAML.title = 'Results Algebraic Machine Learning';
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
      if (json.Error) {
        console.log('An error occurred: ', json.Error);
        throwError(new Error(json.Error));
        return json;
      } else {
        return json;
      }
    });
  }
};

predictButtonAML.$click.subscribe(async () => {
  if (!aml_model['ready']) {
    throwError(new Error('No AML model has been trained'));
  } else {
    if (choose_model.$value.get() === 'Sensors') {
      await batchAML.clear();
      await batchAML.predict(mockAMLModel, trainingSet);
        
      console.log('Predictions done');
      console.log(batchAML.items().service)
    } else {
      batchAML.clear();
      batchAML.predict(mockAMLModel, trainingSet3);
    }
  } 
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
      togNN.$checked.set(false);
    }, 500);
  }
  else if (checked && choose_model.$value.get() != 'Sensors') {
    throwError(new Error('Functionality only available for the Sensors dataset'));
    setTimeout(() => {
      togNN.$checked.set(false);
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
  } else if (checked && choose_model.$value.get() != 'Sensors') {
    throwError(new Error('Functionality only available for the Sensors dataset'));
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
      if (json.Error) {
        console.log('An error occurred: ', json.Error);
        throwError(new Error(json.Error));
        return json;
      } else {
        return json;
        }
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

  fiware_node_status.$value.set(' <h2>Creating...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

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

    if (json.Error) {
      console.log('Fiware Node not created: ', json.Error);
      fiware_node_status.$value.set('<p>Not Created </p> ');
      throwError(new Error(json.Error));  
    } else if (json.message=='OK') {
      create_fiware.$disabled.set(true);
      fiware_node_status.$value.set('<h2>Created !</h2>'); 
    }

  });
});

// Post the data to the Context Broker
post_data.$click.subscribe( async () => {

  if (upload_data.$images.value == undefined)
  {
    throwError(new Error('No data has been uploaded'));
    data_status.$value.set('<p>Not Sended</p> ');
  } else if (fiware_node_status.$value.get() != '<h2>Created !</h2>') {
    throwError(new Error('No Fiware Node has been created'));
  }
  else
  {
    data_status.$value.set(' <h2>Sending...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

    async function process_image(img) {
      const result = {
        x: await get_features(img),  // Extract features from the image
        thumbnail: img,              // Store the original image
        y: label.$value.get(),       // Get the current label value
      };
      return result;
    }

    // Call the function with a single image
    const image_result = await process_image(image);
    // Prepare the data for the AML model
    const json_dt = {
      width : image.width,
      height : image.height,
      data : calculate_time_features([image_result]).x,
      model : choose_model.$value.get(),
    };

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
      body: JSON.stringify(json_dt) // body data type must match "Content-Type" header
    })
    .then(response => response.json())
    .then(async json => {
      if (json.Error) {
        console.log('Data not sended');
        data_status.$value.set('<h2>Data could not be sended:</h2> ' + json.Error);
      } else if (json.message=='OK') {
        data_status.$value.set('<h2>Sended !</h2> ');
        solution_status.$value.set('<h2>Waiting for solution...</h2> ');
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
          if (json.Error) {
            console.log('Solution not received');
            solution_status.$value.set('<p>Not Received</p> ');
            throwError(new Error(json.Error));
          } else {
            solution_status.$value.set('<h2>Solution received !</h2> ');
            var solution_attr = fiware_params.parameters['Attribute Solution'].value;
            var solution = json[solution_attr];
            var solution_string = JSON.stringify(solution, null, 4);
            console.log(solution_string);
            get_solution.$value.set(`<pre>${solution_string}</pre>`);
          }
        });
      }
    });
  }
});

// Upload the data that will be sent to the Context Broker
upload_data.$images.subscribe( async (img) => {

  image = img;
  data_status.$value.set(' <h2>Image uploaded</h2> ');
});


// -----------------------------------------------------------
// STATUS
// -----------------------------------------------------------

const url_health_amlip = "http://localhost:5000/health-check/amlip";
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

if (sessionStorage.getItem('dashboard-started') === null) {
  const content = {sessionStore: 'empty'};
  fetch(url_health_amlip, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "omit", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(content), // body data type must match "Content-Type" header
  })
  .then(response => response.json())
  .then(async json => {
    if (json.Error) {
      throwError(new Error(json.Error));
    }
    else {
      ts.clear();
    }
  });
}

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
    if (Object.keys(json).length != 0) {

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
    } 
  });
}
// Fetch the status every 1 seconds
setInterval(fetchStatus, 1000); // 1000 milliseconds = 1 seconds

// -----------------------------------------------------------
// localStorage Management
// -----------------------------------------------------------

const url_health = "http://localhost:5000/health-check";
async  function isBackendUp(){
  try {
    const response = await fetch(url_health, { method: 'GET' });
    return response.ok;
} catch (error) {
    return false; // Backend is down
}
}

async function handleBackendDown() {
  const backendIsUp = await isBackendUp();
  
  if (!backendIsUp) {
      console.warn("Backend server is down.");
      
      await ts.clear();

  } else {

      fetchStatus();
      console.log("Backend server is up.");
  }
}

setInterval(handleBackendDown, 1000); // Check every 1 second

sessionStorage.setItem('dashboard-started', '{}');

// -----------------------------------------------------------
// AML-IP Management
// -----------------------------------------------------------

const amlip_widget = widget();

// -----------------------------------------------------------
// DASHBOARDS
// -----------------------------------------------------------

const dash = dashboard({
  title: 'AML Explorer',
  author: 'DFKI - INRIA - EPROSIMA',
});

dash
  .page('Data Management')
  .sidebar(choose_model, std_dataset, input, instanceViewer)
  .use([label, capture], trainingSetBrowser, trainingSetBrowser2);
dash.page('Training').sidebar(b_train_AML, uploadAtomization, fileUploadedStatus, n_jobs, controls, textAMLTrainStatus).use([b], [params], [prog], [plotTraining]);
dash.page('Fetching').sidebar(collaborative_status).use([search_statistics], [statistics_received], [request_model], [model_received]);
dash.page('Batch Prediction').use( [predictButtonAML, confMatAML], [predictButton, confMat]);
dash.page('Real-time Prediction').sidebar(togAML, togNN, input).use([plotResultsNN, plotResultsAML]);
dash.page('Context broker').sidebar(create_fiware, fiware_node, fiware_node_status).use([upload_data], [post_data], [data_status], [get_solution], [solution_status]);
dash.page('AML-IP',false).sidebar(amlip_widget)
dash.page('Status').use([tst]);
dash.settings.dataStores(store, store2).datasets(trainingSet).models(classifier).predictions(batchMLP).use([]);

dash.show();
