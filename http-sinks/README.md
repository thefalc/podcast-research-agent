# Podcast Research Agent HTTP Sink APIs

This folder contains a simple express app that supports two endpoints, **/process-urls**
and **/generate-research-brief**.

## Processing URLs

The **/process-urls**, is called by Kafka once a new research bundle is created and saved
to MongoDB. This API endpoint performs the heavy lifting for pulling in data from the URLs associated
with the bundle, chunking the text, and creating the embeddings.

All of this data is written to a Kafka topic to be sinked with MongoDB for vector search.

## Generate research brief

The **/generate-research-brief**, is called by Kafka once the vector data for a research bundle
is saved. This API endpoint uses all the data about the research bundle to create a prompt with
relevant context to generate the research brief.

The research brief is saved to MongoDB and will now be available in the web application.

## Configuring the application

You need to create a **.env** file with the following values:
* MONGODB_DB_USER
* MONGODB_DB_PWD
* OPENAI_API_KEY
* LANGCHAIN_TRACING_V2
* LANGCHAIN_API_KEY

As well as a **client.properties** file that contains properties to connect to Confluent.

## Running the application

From the your terminal, navigate to the **/http-sinks** directory and enter the following command:

```shell
npm install
node app.js
```