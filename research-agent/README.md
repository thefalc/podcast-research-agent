# Podcast Research Agent HTTP Sink APIs

This folder contains a NextJS app that supports two API endpoints, `/api/process-urls`
and `/api/generate-research-brief`. These are called by Kafka as sink connectors to build the
research brief behind the scenes.

Refer to the main README.md for detailed instructions in how to setup and configure this application.

## Processing URLs

The `/api/process-urls`, is called by Kafka once a new research bundle is created and saved
to MongoDB. This API endpoint performs the heavy lifting for pulling in data from the URLs associated
with the bundle, chunking the text, and creating the embeddings.

All of this data is written to a Kafka topic to be sinked with MongoDB for vector search.

## Generate research brief

The `/api/generate-research-brief`, is called by Kafka once the vector data and mined questions for a
research bundle are saved. This API endpoint uses all the data about the research bundle to 
generate the research brief.

The research brief is saved to MongoDB and is then available in the web application.

## Configuring the application

You need to create a `.env` file with the following values:
* MONGODB_URI
* OPENAI_API_KEY
* LANGCHAIN_TRACING_V2
* LANGCHAIN_API_KEY

As well as a `client.properties` file that contains properties to connect to Confluent.

## Running the application

From the your terminal, navigate to the `/research-agent` directory and enter the following command:

```shell
npm install
npm run dev
```