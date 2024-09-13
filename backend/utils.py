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

import os
import re

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
