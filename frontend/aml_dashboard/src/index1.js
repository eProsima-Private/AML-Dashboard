// Copyright 2024 Proyectos y Sistemas de Mantenimiento SL (eProsima).
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import '@marcellejs/core/dist/marcelle.css';
import {
  button,
  modelParameters,
  select,
  Stream,
  text,
  throwError
} from '@marcellejs/core';

import  { dashboard } from './components';

// -----------------------------------------------------------
// COMPUTING NODE
// -----------------------------------------------------------

const create_computing = button('Create');
create_computing.title = 'Computing Node';

const stop_computing = button('Stop');
stop_computing.title = 'Stop Computing Node';

const run_computing = button('Run');
run_computing.title = 'Run Computing Node';

const stop_delete_computing = button('Stop and Delete');
stop_delete_computing.title = 'Stop and Delete Computing Node';

const comp_stop_params = {
  parameters: {
    'Node ID': new Stream('AsyncComputingNode.95.1d.0d.e6', true),
  },
};

const computing_node_status = text('Not Created');
computing_node_status.title = 'Computing Node Status';

const url_create_computing = "http://localhost:5000/computing/";

// -----------------------------------------------------------
// CREATE COMPUTING NODE 
// -----------------------------------------------------------

// Create the Computing Node
create_computing.$click.subscribe( async () => {

  computing_node_status.$value.set(' <h2>Creating...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');
  fetch(url_create_computing + 'start',  {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
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
      console.log('Computing Node not created: ', json.Error);
      computing_node_status.$value.set('<p>Not Created </p> ');
      throwError(new Error(json.Error));  
    } else if (json.message=='OK') {
      computing_node_status.$value.set('<h2>Created and running !</h2>');
    }
  });
});

// -------------------Stop Computing Node--------------------

const comp_stop_node = modelParameters(comp_stop_params);
comp_stop_node.title = 'Indicate the ID of Computing Node to manage:';


stop_computing.$click.subscribe( async () => {

  computing_node_status.$value.set(' <h2>Stopping...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in comp_stop_params.parameters) {
    parameters[param] = comp_stop_params.parameters[param].value;
  }
  fetch(url_create_computing + 'stop',  {
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
      console.log('Computing Node not stopped: ', json.Error);
      computing_node_status.$value.set('<p>Not Stopped </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      computing_node_status.$value.set('<h2>Stopped !</h2>');
    }
  });
});

// ------------------------- Run Computing Node--------------------------

run_computing.$click.subscribe( async () => {

  computing_node_status.$value.set(' <h2>Running...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in comp_stop_params.parameters) {
    parameters[param] = comp_stop_params.parameters[param].value;
  }
  fetch(url_create_computing + 'run',  {
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
        console.log('Computing Node not run: ', json.Error);
        computing_node_status.$value.set('<p>Not Run </p> ');
        throwError(new Error(json.Error));
      } else if (json.message=='OK') {
        computing_node_status.$value.set('<h2>Running !</h2>');
      }
    });
});

// --------------------Stop and Delete Computing Node--------------------

stop_delete_computing.$click.subscribe( async () => {

  computing_node_status.$value.set(' <h2>Deleting...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in comp_stop_params.parameters) {
    parameters[param] = comp_stop_params.parameters[param].value;
  }
  fetch(url_create_computing + 'drop',  {
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
      console.log('Computing Node not deleted: ', json.Error);
      computing_node_status.$value.set('<p>Not Deleted </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      computing_node_status.$value.set('<h2>Deleted !</h2>');
    }
  });
});


// -----------------------------------------------------------
// FETCHING
// ----------------------------------------------------------

const url_fetcher = "http://localhost:5000/fetcher/";

const create_sender = button('Create');
create_sender.title = 'Sender Node';

const run_sender = button('Run');
run_sender.title = 'Run Sender Node';

const stop_sender = button('Stop');
stop_sender.title = 'Stop Sender Node';

const stop_delete_sender = button('Stop and Delete');
stop_delete_sender.title = 'Delete Sender Node';

const sender_node_status = text('Not Created');
sender_node_status.title = 'Computing Node Status';


// Create the Sender Node

create_sender.$click.subscribe( async () => {

  sender_node_status.$value.set(' <h2>Creating...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  fetch(url_fetcher + 'sender',  {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
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
      console.log('Sender Node not created: ', json.Error);
      sender_node_status.$value.set('<p>Not Created </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      sender_node_status.$value.set('<h2>Created !</h2>');
      create_sender.$disabled.set(true);
    }
  });
});

// -------------------Stop and Delete Sender Node--------------------

stop_delete_sender.$click.subscribe( async () => {

  sender_node_status.$value.set(' <h2>Deleting...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  fetch(url_fetcher + 'sender/drop',  {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
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
      console.log('Sender Node not deleted: ', json.Error);
      sender_node_status.$value.set('<p>Not Deleted </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      sender_node_status.$value.set('<h2>Deleted !</h2>');
      create_sender.$disabled.set(false);
    }
  });
});

// -----------------------------------------------------------
// INFERENCE NODE
// -----------------------------------------------------------
const create_inference = button('Create');
create_inference.title = 'Inference Node';

const stop_inference = button('Stop');
stop_inference.title = 'Stop Inference Node';

const run_inference = button('Run');
run_inference.title = 'Run Inference Node';

const stop_delete_inference = button('Stop and Delete');
stop_delete_inference.title = 'Stop and Delete Inference Node';

const inference_node_status = text('Not Created');
inference_node_status.title = 'Inference Node Status';

const url_create_inference = "http://localhost:5000/inference_node/";

const inference_stop_params = {
  parameters: {
    'Node ID': new Stream('AsyncInferenceNode.95.1d.0d.e6', true),
  },
};

// -----------------------------------------------------------
// CREATE INFERENCE NODE
// -----------------------------------------------------------

// Create the Inference Node
create_inference.$click.subscribe( async () => {

  inference_node_status.$value.set(' <h2>Creating...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  fetch(url_create_inference + 'create',  {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
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
      console.log('Inference Node not created: ', json.Error);
      inference_node_status.$value.set('<p>Not Created </p> ');
      throwError(new Error(json.Error));  
    } else if (json.message=='OK') {
      inference_node_status.$value.set('<h2>Created !</h2>'); 
    }

  });
});

// ---------------------Stop Inference Node--------------------

const inference_stop_node = modelParameters(inference_stop_params);
inference_stop_node.title = 'Indicate the ID of Inference Node to stop:';

stop_inference.$click.subscribe( async () => {

  inference_node_status.$value.set(' <h2>Stopping...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in inference_stop_params.parameters) {
    parameters[param] = inference_stop_params.parameters[param].value;
  }
  fetch(url_create_inference + 'stop',  {
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
      console.log('Inference Node not stopped: ', json.Error);
      inference_node_status.$value.set('<p>Not Stopped </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      inference_node_status.$value.set('<h2>Stopped !</h2>');
    }
  });
});

// ------------------------ Run Inference Node -------------------------

run_inference.$click.subscribe( async () => {

  inference_node_status.$value.set(' <h2>Running...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in inference_stop_params.parameters) {
    parameters[param] = inference_stop_params.parameters[param].value;
  }
  fetch(url_create_inference + 'run',  {
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
      console.log('Inference Node not run: ', json.Error);
      inference_node_status.$value.set('<p>Not Run </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      inference_node_status.$value.set('<h2>Running !</h2>');
    }
  });
});

// ----------------- Stop and Delete Inference Node --------------------

stop_delete_inference.$click.subscribe( async () => {

  inference_node_status.$value.set(' <h2>Deleting...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in inference_stop_params.parameters) {
    parameters[param] = inference_stop_params.parameters[param].value;
  }
  fetch(url_create_inference + 'drop',  {
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
      console.log('Inference Node not deleted: ', json.Error);
      inference_node_status.$value.set('<p>Not Deleted </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      inference_node_status.$value.set('<h2>Deleted !</h2>');
    }
  });
});

// -----------------------------------------------------------
// AGENT NODE
// -----------------------------------------------------------

const transport_protocol = select(['TCP', 'UDP'], 'TCP');
transport_protocol.title = 'Choose the Transport Protocol';

// Client Node
// -----------------------------------------------------------

// Configure the parameters for the Client Node
const client_node_params = {
  parameters: {
    'Name': new Stream('MyClientNode', true),
    'Domain': new Stream(0, true),
    'Server IP Address': new Stream('192.168.1.153', true),
    'Server Address Port': new Stream( 12121, true),
  },
};

const client_node = modelParameters(client_node_params);
client_node.title = 'Choose parameters for the Client Node creation:';

const create_client_node = button('Create');
create_client_node.title = 'Create Agent Client Node';;

const delete_client_node = button('Delete');
delete_client_node.title = 'Delete Agent Client Node';

const client_node_status = text('Not Created');
client_node_status.title = 'Client Node Status';

const url_create_client_node = "http://localhost:5000/client_node";


// Create the Agent Client Node
create_client_node.$click.subscribe( async () => {

  client_node_status.$value.set(' <h2>Creating...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in client_node_params.parameters) {
    parameters[param] = client_node_params.parameters[param].value;
  }
  parameters['Transport Protocol'] = transport_protocol.$value.get();

  fetch(url_create_client_node,  {
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
      console.log('Client Node not created: ', json.Error);
      client_node_status.$value.set('<p>Not Created </p> ');
      throwError(new Error(json.Error));  
    } else if (json.message=='OK') {
      client_node_status.$value.set('<h2>Created !</h2>'); 
      create_client_node.$disabled.set(true);
      delete_client_node.$disabled.set(false);
    }

  });
});

// Delete the Agent Client Node

const url_delete_client_node = "http://localhost:5000/client_node/stop";

delete_client_node.$click.subscribe( async () => {

  client_node_status.$value.set(' <h2>Deleting...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');
  
  fetch(url_delete_client_node,  {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
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
      console.log('Client Node not deleted: ', json.Error);
      client_node_status.$value.set('<p>Not Deleted </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      client_node_status.$value.set('<h2>Deleted !</h2>');
      create_client_node.$disabled.set(false);
      delete_client_node.$disabled.set(true);
    }
  });
});

// Server Node
// -----------------------------------------------------------

// Configure the parameters for the Server Node
const server_node_params = {
  parameters: {
    'Name': new Stream('MyServerNode', true),
    'Domain': new Stream(0, true),
    'Server IP Address': new Stream('192.168.1.153', true),
    'Server Address Port': new Stream( 12121, true),
  },
};

const server_node = modelParameters(server_node_params);
server_node.title = 'Choose parameters for the Server Node creation:';

const create_server_node = button('Create');
create_server_node.title = 'Create Agent Server Node';

const delete_server_node = button('Delete');
delete_server_node.title = 'Delete Agent Server Node';

const server_node_status = text('Not Created');
server_node_status.title = 'Server Node Status';

const url_create_server_node = "http://localhost:5000/server_node";

// Create the Agent server Node
create_server_node.$click.subscribe( async () => {

  server_node_status.$value.set(' <h2>Creating...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in server_node_params.parameters) {
    parameters[param] = server_node_params.parameters[param].value;
  }
  parameters['Transport Protocol'] = transport_protocol.$value.get();
  fetch(url_create_server_node,  {
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
      console.log('Server Node not created: ', json.Error);
      server_node_status.$value.set('<p>Not Created </p> ');
      throwError(new Error(json.Error));  
    } else if (json.message=='OK') {
      server_node_status.$value.set('<h2>Created !</h2>');
      create_server_node.$disabled.set(true);
      delete_server_node.$disabled.set(false);
    }
  });
});

// Delete the Agent Server Node+

const url_delete_server_node = "http://localhost:5000/server_node/stop";

delete_server_node.$click.subscribe( async () => {

  server_node_status.$value.set(' <h2>Deleting...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  fetch(url_delete_server_node,  {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
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
      console.log('Server Node not deleted: ', json.Error);
      server_node_status.$value.set('<p>Not Deleted </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      server_node_status.$value.set('<h2>Deleted !</h2>');
      create_server_node.$disabled.set(false);
      delete_server_node.$disabled.set(true);
    }
  });
});


// Repeater Node
// -----------------------------------------------------------

// Configure the parameters for the Repeater Node
const repeater_node_params = {
  parameters: {
    'Name': new Stream('MyRepeaterNode', true),
    'IP Address': new Stream('192.168.1.153', true),
    'Address Port': new Stream( 12121, true),
  },
};

const repeater_node = modelParameters(repeater_node_params);
repeater_node.title = 'Choose parameters for the Repeater Node creation:';

const create_repeater_node = button('Create');
create_repeater_node.title = 'Create Agent Repeater Node';

const delete_repeater_node = button('Delete');
delete_repeater_node.title = 'Delete Agent Repeater Node';

const repeater_node_status = text('Not Created');
repeater_node_status.title = 'Repeater Node Status';

const url_create_repeater_node = "http://localhost:5000/repeater_node";

// Create the Agent Repeater Node

create_repeater_node.$click.subscribe( async () => {

  repeater_node_status.$value.set(' <h2>Creating...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');

  const parameters = {};
  for (let param in repeater_node_params.parameters) {
    parameters[param] = repeater_node_params.parameters[param].value;
  }
  parameters['Transport Protocol'] = transport_protocol.$value.get();
  fetch(url_create_repeater_node,  {
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
      console.log('Repeater Node not created: ', json.Error);
      repeater_node_status.$value.set('<p>Not Created </p> ');
      throwError(new Error(json.Error));  
    } else if (json.message=='OK') {
      repeater_node_status.$value.set('<h2>Created !</h2>');
      create_repeater_node.$disabled.set(true);
      delete_repeater_node.$disabled.set(false);
    }
  });
});

// Delete the Agent Repeater Node

const url_delete_repeater_node = "http://localhost:5000/repeater_node/stop";

delete_repeater_node.$click.subscribe( async () => {

  repeater_node_status.$value.set(' <h2>Deleting...</h2> <br> <img src="https://i.gifer.com/Cad.gif">');
  
  fetch(url_delete_repeater_node,  {
    
    method: "POST", // *GET, POST, PUT, DELETE, etc.
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
      console.log('Repeater Node not deleted: ', json.Error);
      repeater_node_status.$value.set('<p>Not Deleted </p> ');
      throwError(new Error(json.Error));
    } else if (json.message=='OK') {
      repeater_node_status.$value.set('<h2>Deleted !</h2>');
      create_repeater_node.$disabled.set(false);
      delete_repeater_node.$disabled.set(true);
    }
  });
});

// -----------------------------------------------------------
// DASHBOARDS
// -----------------------------------------------------------
const new_dash = dashboard({
});

new_dash.page('Agent Node', false).use([client_node_status, server_node_status, repeater_node_status], [create_client_node, create_server_node, create_repeater_node], [client_node, server_node, repeater_node], transport_protocol, [delete_client_node, delete_server_node, delete_repeater_node]);
new_dash.page('Computing Node').sidebar(computing_node_status, create_computing).use(comp_stop_node, [stop_computing, run_computing,stop_delete_computing]);
new_dash.page('Inference Node').sidebar(inference_node_status, create_inference).use( inference_stop_node, [stop_inference, run_inference, stop_delete_inference]);
new_dash.page('Sender Node').sidebar(sender_node_status).use([create_sender, stop_delete_sender]);
new_dash.show();
