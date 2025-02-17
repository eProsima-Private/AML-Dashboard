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

class loadDataset():
    """
    Abstract class to load different datasets.
    """
    def __init__(
            self):

        self.current_index = 0
        self.training_images = []
        self.training_labels = []
        self.test_images = []
        self.test_labels = []

    def load_training(self):

        """
        Raise exception.
        Abstract method.
        This method should be reimplemented by child class.
        """

        raise NotImplementedError('loadDataset.load_training must be specialized according to the dataset before use.')


    def load_testing(self):

        """
        Raise exception.
        Abstract method.
        This method should be reimplemented by child class.
        """

        raise NotImplementedError('loadDataset.load_testing must be specialized according to the dataset before use.')
    

class imagesGenerator():
    def __init__ (self, 
                  images,
                  labels
                  ):
        self.current_index = 0
        self.images = images
        self.labels = labels

    
    def get_next_digit(self, target_digit, complement=False):
        """
        Retrieves the next image of a specific class from the dataset.
        
        :param target_digit: The class (0-9) to retrieve or to avoid.
        :param complement: Whether to get the class of interest or the rest of the classes.
        :return: A tuple (digit_data, label, index), where:
                 - digit_data is the list of pixel values for the target image.
                 - label is the image label (same as target_digit).
                 - index is the position of the image in the dataset.
        """
        while True:

            # When the current index reaches the end of the dataset, reset it so that it loops
            if self.current_index >= len(self.images):
                self.current_index = 0

            # Get the label of the current image
            label = self.labels[self.current_index]
            # Check if the label matches the target digit
            is_target = (label == target_digit)

            # If the label matches the target digit and we want the target digit, or
            # if the label does not match the target digit and we want the complement
            if (not complement and is_target) or (complement and not is_target):
                digit_data = self.images[self.current_index]
                index = self.current_index
                self.current_index += 1  # Move to the next index for subsequent calls
                yield digit_data, label, index
            else:
                self.current_index += 1

    def get_next_digit_unpacked(self, target_digit, complement=False):
        """
        Unpacks the values from the generator and returns them one by one.
        
        :param target_digit: The digit (0-9) to retrieve.
        :param shuffle: Whether to shuffle and get a random index.
        :return: A tuple (digit_data, label, index) for the next occurrence of the target image.
        """
    
        digit_generator = self.get_next_digit(target_digit, complement)
        
        # Get the next value from the generator
        digit_data, label, index = next(digit_generator)
        return digit_data, label, index
