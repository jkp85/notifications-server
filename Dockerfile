# Pull base image
FROM node

# Maintainer Ernesto Cruz <ecruz@3blades.io>

ADD . /usr/src/app

# Set the working directory
WORKDIR /usr/src/app

# install the dependencies
RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
