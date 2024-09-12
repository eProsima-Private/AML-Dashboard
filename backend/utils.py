import os
import re

def use_most_recent_file(path, required_file): 
        """
        Function that selects the model_ or training_file_ that was most recently downloaded.

        Arguments:
        path: Path to the Downloads directory
        required_file: Prefix of the file to be selected
        
        Returns: path to the most recent file"""
        # Find all files with the name requuired_file_*.json in the folder
        file_list = [f for f in os.listdir(path) if re.search(f'(^{required_file}\([0-7]*\)|^{required_file})\.json$', f)]
        # Sort the file list by creation time in descending order
        file_list.sort(key=lambda x: os.path.getctime(os.path.join(path, x)), reverse=True)
        # Return the path to the most recent file
        if file_list:
            return os.path.join(path, file_list[0])
        else:
            print(f'No files found with prefix "{required_file}" in {path}.')
            exit(1)