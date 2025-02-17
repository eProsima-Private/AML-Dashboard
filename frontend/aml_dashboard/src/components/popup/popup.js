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

export async function showCustomModal() {
  
    // Create the overlay
    return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "1000";
  
    // Create the modal box
    const modal = document.createElement("div");
    modal.style.backgroundColor = "white";
    modal.style.borderRadius = "8px";
    modal.style.padding = "20px";
    modal.style.textAlign = "center";
    modal.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    modal.style.minWidth = "300px";
  
    // Add the message
    const message = document.createElement("p");
    message.textContent = "Do you want to keep training using the uploaded atomization file?";
    message.style.marginBottom = "20px";
    modal.appendChild(message);
  
    // Create the button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-evenly";
  
    // Yes button
    const yesButton = document.createElement("button");
    yesButton.textContent = "Yes";
    yesButton.style.padding = "10px 20px";
    yesButton.style.border = "1px solid #ccc";
    yesButton.style.borderRadius = "4px";
    yesButton.style.backgroundColor = "white";
    yesButton.style.color = "#444";
    yesButton.style.cursor = "pointer";
    yesButton.style.fontSize = "16px";
  
    // No button
    const noButton = document.createElement("button");
    noButton.textContent = "No";
    noButton.style.padding = "10px 20px";
    noButton.style.border = "1px solid #ccc";
    noButton.style.borderRadius = "4px";
    noButton.style.backgroundColor = "#f8d7da";
    noButton.style.color = "#444";
    noButton.style.cursor = "pointer";
    noButton.style.fontSize = "16px";
  
    // Append buttons to the container
    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    modal.appendChild(buttonContainer);
  
    // Append modal to the overlay
    overlay.appendChild(modal);
  
    // Append overlay to the body
    document.body.appendChild(overlay);
  
    // Handle button clicks
    yesButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };
    
    noButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };
  });
}

export async function showCustomAlert() {
  
  // Create the overlay
  return new Promise((resolve) => {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "1000";

  // Create the modal box
  const modal = document.createElement("div");
  modal.style.backgroundColor = "white";
  modal.style.borderRadius = "8px";
  modal.style.padding = "20px";
  modal.style.textAlign = "center";
  modal.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  modal.style.minWidth = "300px";

  // Add the message
  const message = document.createElement("p");
  message.textContent = "To create the Sensors dataset, press Hold to Record Instances button.";
  message.style.marginBottom = "20px";
  modal.appendChild(message);

  // Create the button container
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "space-evenly";

  // OK button
  const okButton = document.createElement("button");
  okButton.textContent = "OK";
  okButton.style.padding = "10px 20px";
  okButton.style.border = "1px solid #ccc";
  okButton.style.borderRadius = "4px";
  okButton.style.backgroundColor = "white";
  okButton.style.color = "#444";
  okButton.style.cursor = "pointer";
  okButton.style.fontSize = "16px";

  // Append buttons to the container
  buttonContainer.appendChild(okButton);
  modal.appendChild(buttonContainer);

  // Append modal to the overlay
  overlay.appendChild(modal);

  // Append overlay to the body
  document.body.appendChild(overlay);

  // Handle button clicks
  okButton.onclick = () => {
    document.body.removeChild(overlay);
    resolve(true);
  };
});
}

// fileupload function implementation
export async function fileupload() {
  return new Promise((resolve, reject) => {
    // Create a hidden file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none";

    // Append the input to the body
    document.body.appendChild(fileInput);

    // Listen for file selection
    fileInput.addEventListener("change", () => {
      const files = fileInput.files;

      if (files.length === 0) {
        reject(new Error("No file selected"));
        document.body.removeChild(fileInput);
        return;
      }

      // Resolve with the selected file(s)
      resolve(files[0]);
      document.body.removeChild(fileInput);
    });

    // Trigger the file input dialog
    fileInput.click();
  });
}

function showCustomMessage(message, type = "error") {
  // Create the message overlay
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "2000";

  // Create the message box
  const messageBox = document.createElement("div");
  messageBox.style.backgroundColor = "white";
  messageBox.style.borderRadius = "8px";
  messageBox.style.padding = "20px";
  messageBox.style.textAlign = "center";
  messageBox.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  messageBox.style.maxWidth = "400px";
  messageBox.style.width = "80%";

  // Set the message text
  const messageText = document.createElement("p");
  messageText.textContent = message;
  messageText.style.marginBottom = "20px";
  messageText.style.fontSize = "16px";
  messageText.style.color = type === "error" ? "#374151" : "#4caf50"; // Red for error, green for success
  messageText.style.fontWeight = "bold";

  // Add a close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "OK";
  closeButton.style.padding = "10px 20px";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "4px";
  closeButton.style.backgroundColor = type === "error" ? "#fecdd3" : "#4caf50";
  closeButton.style.color = "#444";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "14px";

  // Append elements
  messageBox.appendChild(messageText);
  messageBox.appendChild(closeButton);
  overlay.appendChild(messageBox);
  document.body.appendChild(overlay);

  // Close the message box on button click
  closeButton.onclick = () => {
    document.body.removeChild(overlay);
  };
}

// showPopupFileUpload function implementation
export async function showPopupFileUpload() {
  // Create the overlay
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "1000";

    // Create the modal box
    const modal = document.createElement("div");
    modal.style.backgroundColor = "white";
    modal.style.borderRadius = "8px";
    modal.style.padding = "20px";
    modal.style.textAlign = "center";
    modal.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    modal.style.minWidth = "400px";

    // Create the "Upload File" clickable area
    const uploadArea = document.createElement("div");
    uploadArea.textContent = "Click here to upload a file or drag one here";
    uploadArea.style.padding = "40px";
    uploadArea.style.border = "2px dashed #ccc";
    uploadArea.style.borderRadius = "4px";
    uploadArea.style.backgroundColor = "#f9f9f9";
    uploadArea.style.color = "#555";
    uploadArea.style.cursor = "pointer";
    uploadArea.style.fontSize = "16px";
    uploadArea.style.marginTop = "10px";

    // Add a "Cancel" button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.style.marginTop = "20px";
    cancelButton.style.padding = "10px 20px";
    cancelButton.style.border = "1px solid #ccc";
    cancelButton.style.borderRadius = "4px";
    cancelButton.style.backgroundColor = "#f8d7da";
    cancelButton.style.color = "#444";
    cancelButton.style.cursor = "pointer";
    cancelButton.style.fontSize = "16px";

    // Append the upload area and cancel button to the modal
    modal.appendChild(uploadArea);
    modal.appendChild(cancelButton);

    // Append modal to the overlay
    overlay.appendChild(modal);

    // Append overlay to the body
    document.body.appendChild(overlay);

    // Handle file upload click
    uploadArea.onclick = async () => {
      try {
        const file = await fileupload(); // Call the fileupload function
        handleFile(file, resolve, overlay);
      } catch (error) {
        console.error("File upload failed:", error.message);
        document.body.removeChild(overlay);
        resolve(false); // Resolve with false on failure
      }
    };

    // Add drag-and-drop functionality
    uploadArea.addEventListener("dragover", (event) => {
      event.preventDefault();
      uploadArea.style.backgroundColor = "#e6e6e6";
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.style.backgroundColor = "#f9f9f9";
    });

    uploadArea.addEventListener("drop", (event) => {
      event.preventDefault();
      uploadArea.style.backgroundColor = "#f9f9f9";
      const file = event.dataTransfer.files[0];
      handleFile(file, resolve, overlay);
    });

    // Handle cancel button click
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(null); // Resolve with null to indicate cancellation
    };
  });
}

// Helper function to handle the file
function handleFile(file, resolve, overlay) {
  const allowedExtensions = /\.json$/;

  if (!file.name.match(allowedExtensions)) {
    showCustomMessage("Invalid file extension. Please upload a .json file.");
    return;
  }

  console.log("File selected:", file.name); // Log the file name
  document.body.removeChild(overlay);
  resolve(file); // Resolve with the selected file object
}
