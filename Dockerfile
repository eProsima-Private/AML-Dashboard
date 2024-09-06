
#########################################################################################
# AML-IP Dockerfile
#########################################################################################

FROM ubuntu:jammy

# Avoids using interactions during building
ENV DEBIAN_FRONTEND=noninteractive

# Use a bash shell so it is possigle to run things like `source` (required for colcon builds)
SHELL ["/bin/bash", "-c"]

ARG amlip_branch="main"

# Avoid interactuation with installation of some package that needs the locale.
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Download system dependencies
RUN apt update && \
    apt install -y software-properties-common && \
    apt update && \
    add-apt-repository ppa:deadsnakes/ppa && \
    apt update && \
    apt install -y \
        cmake \
        g++ \
        git \
        libasio-dev \
        libssl-dev \
        libtinyxml2-dev \
        libyaml-cpp-dev \
        pip \
        swig \
        wget \
        npm \
        nodejs && \
    pip3 install -U colcon-common-extensions \
        vcstool \
        astropy==5.3.4 \
        blinker==1.7.0 \
        cffi==1.16.0 \
        click==8.1.7 \
        Flask==3.0.0 \
        Flask-Cors==4.0.0 \
        itsdangerous==2.1.2 \
        Jinja2==3.1.2 \
        joblib==1.3.2 \
        MarkupSafe==2.1.3 \
        msgpack==1.0.7 \
        numpy==1.26.1 \
        packaging==23.2 \
        pandas==2.1.2 \
        pycparser==2.21 \
        pyerfa==2.0.1.1 \
        python-dateutil==2.8.2 \
        pytz==2023.3.post1 \
        PyYAML==6.0.1 \
        scikit-learn==1.3.2 \
        scipy==1.11.3 \
        six==1.16.0 \
        threadpoolctl==3.2.0 \
        tqdm==4.66.1 \
        tzdata==2023.3 \
        Werkzeug==3.0.1

# Install AML-IP
WORKDIR /AML-IP
RUN mkdir src && \
    wget https://raw.githubusercontent.com/eProsima/AML-IP/$amlip_branch/amlip.repos && \
    vcs import src < amlip.repos && \
    cd src/amlip && \
    git checkout $amlip_branch && \
    cd ../.. && \
    colcon build --packages-up-to-regex amlip_py

# Copy backend source code from host
WORKDIR /backend
COPY backend/ /backend/

# Copy frontend source code from host
WORKDIR /frontend
COPY frontend/ /frontend/

WORKDIR /

# Source built workspace
RUN echo "source /AML-IP/install/setup.bash" >> ~/.bashrc
