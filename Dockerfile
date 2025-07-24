FROM ubuntu:22.04

# Install build dependencies
RUN apt-get update && apt-get install -y \
    make git zlib1g-dev libssl-dev gperf cmake g++ wget unzip \
    && apt-get clean

# Clone Telegram Bot API source
RUN git clone --recursive https://github.com/tdlib/telegram-bot-api.git

# Build Telegram Bot API
WORKDIR /telegram-bot-api
RUN rm -rf build && mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX:PATH=.. .. && \
    cmake --build . --target install && \
    cp ../bin/telegram-bot-api /usr/local/bin/

# Clean up
RUN rm -rf /telegram-bot-api

# Expose the API server port
EXPOSE 8081

# Default command using env variables
CMD ["sh", "-c", "telegram-bot-api --api-id=$TELEGRAM_API_ID --api-hash=$TELEGRAM_API_HASH --local --http-port=8081"]
