# Copyright 2024 Proyectos y Sistemas de Mantenimiento SL (eProsima).
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import base64
import io
import math
import numpy as np
import os
import random
import re

from PIL import Image

def use_most_recent_file(path, required_file): 
        """
        Function that selects the most recently created file with a given name (required_file*.json)  in the specified path.

        Arguments:
        path: Path to the directory containing files
        required_file: Prefix of the file to be selected
        
        Returns: path to the most recent file
        """
        # Find all files with the name required_file*.json in the path
        file_list = [f for f in os.listdir(path) if re.search(f'(^{required_file}\([0-7]*\)|^{required_file})\.json$', f)]
        # Sort the file list by creation time in descending order
        file_list.sort(key=lambda x: os.path.getctime(os.path.join(path, x)), reverse=True)
        # Return the path to the most recent file
        if file_list:
            return os.path.join(path, file_list[0])
        else:
            print(f'No files found with prefix "{required_file}" in {path}.')
            exit(1)


def save_in_format(images, labels):
    """
    Function that formats the data to be saved in the required format.
    Arguments:
    images: List of images. Each image is a one-dimensional list.
    labels: List of labels. Each label is a numeric value.
    returns: Formatted data
    """

    def generate_data_uri(image):
        """
        Convert a 2D image list or array to a PNG data URI.
        """
        # Convert the list to a NumPy array for processing
        image_len = len(image)
        one_side = int(math.sqrt(image_len))
        image_array = np.array(image, dtype=np.uint8).reshape(one_side, one_side)
        img = Image.fromarray(image_array, mode="L")  # Create a PIL image from the array
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")  # Save the image to the buffer in PNG format
        img_data = buffered.getvalue()
        data_uri = f"data:image/png;base64,{base64.b64encode(img_data).decode('utf-8')}"
        return data_uri
    
    combined_data = list(zip(images, labels))
    sampled_data = random.sample(combined_data, 100)
    sampled_images, sampled_labels = zip(*sampled_data)
    # Prepare the data in the required format
    formatted_data = {
        "total": len(images),
        "limit": 1000,  
        "skip": 0,
        "instances": [
            {
                "datasetName": "training2-set-models",
                "x": image, # The image must be a one-dimensional list
                "thumbnail": generate_data_uri(image),
                "y": label, # The label must be numeric
                "id": idx,
            }
            for idx, (image, label) in enumerate(zip(sampled_images, sampled_labels))
        ]
    }

    return formatted_data
