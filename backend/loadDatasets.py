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

import logging
import numpy as np

from keras.datasets import cifar10
from mnist.loader import MNIST

from load_and_preprocess_datasets import loadDataset

class loadMedMnist(loadDataset):

    """
    Child class to load the MedMNIST dataset.
    """
    def __init__(
            self):
        super().__init__()
    
    def load_training(self):
        training_images = np.load('MedMNIST/pneumoniamnist.npz')['train_images']
        self.training_images = training_images.reshape(len(training_images), 28*28)
        self.training_labels = np.load('MedMNIST/pneumoniamnist.npz')['train_labels'].reshape(len(training_images))
        return self.training_images, self.training_labels
    
    def load_testing(self):
        test_images = training_images = np.load('MedMNIST/pneumoniamnist.npz')['test_images']
        self.test_images = test_images.reshape(len(test_images), 28*28)
        self.test_labels = np.load('MedMNIST/pneumoniamnist.npz')['test_labels'].reshape(len(training_images))
        return self.test_images, self.test_labels

class loadMNIST(loadDataset):
    """
    Child class to load the MNIST dataset.
    """
    def __init__(
            self, 
            dataset_path: str):
        super().__init__()
        self.dataset_path = dataset_path

        print (logging.INFO, 'Dataset path: ', self.dataset_path)
    
    def load_training(self):
        mndata = MNIST(self.dataset_path)
        training_images, training_labels = mndata.load_training()
        self.training_images = np.array(training_images)
        self.training_labels = np.array(training_labels)
        return self.training_images, self.training_labels
    
    def load_testing(self):
        mndata = MNIST(self.dataset_path, return_type='numpy')
        images, labels = mndata.load_testing()
        self.test_labels = np.array(labels)
        self.test_images = np.array(images)
        return self.test_images, self.test_labels

class loadKMNIST(loadDataset):
    """
    Child class to load the KMNIST dataset.
    """
    def __init__(
            self):
        super().__init__()
        self.current_index = 0  # To keep track of the position when fetching digits
    
    def load_training(self):
        training_images = np.load('KMNIST/kmnist-train-imgs.npz')['arr_0']
        self.training_images = training_images.reshape(len(training_images), 28*28)
        self.training_labels = np.load('KMNIST/kmnist-train-labels.npz')['arr_0']
        return self.training_images, self.training_labels
    
    def load_testing(self):
        test_images = np.load('KMNIST/kmnist-test-imgs.npz')['arr_0']
        self.test_images = test_images.reshape(len(test_images), 28*28)
        self.test_labels = np.load('KMNIST/kmnist-test-labels.npz')['arr_0']
        return self.test_images, self.test_labels
    
class loadCIFAR10(loadDataset):
    """
    Child class to load the CIFAR-10 dataset.
    """
    def __init__(
            self):
        super().__init__()
        self.current_index = 0  # To keep track of the position when fetching digits
        (self.trainingImages, self.trainingLabels), (self.testImages, self.testLabels) = cifar10.load_data()
    
    def load_training(self):
        self.training_images = self.trainingImages[:,:,:,2].reshape(len(self.trainingImages), 32*32)
        self.training_labels = self.trainingLabels.reshape(len(self.trainingLabels))
        return self.training_images, self.training_labels
    
    def load_testing(self):
        self.test_images= self.testImages[:,:,:,2].reshape(len(self.testImages), 32*32)
        self.test_labels = self.testLabels.reshape(len(self.testLabels))
        return self.test_images, self.test_labels
