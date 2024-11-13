# Podcast research Agent
If you're a podcast host, this application does the topic and guest research for you!

Enter your source materials like blog URLs, other podcasts, the guest name and topic, save it as a research bundle and let
some AI magic do the work for you.

# Event-driven AI

This project demonstrates how to create an AI-powered application that de-couples the data engineering and AI
parts of the service from the application tier. 

The project is split into two applications. The `web-application` is a NextJS application that uses
a standard three tier stack consisting of a frontend written in React, a backend in Node,
and a MongoDB application database.

Kafka and Flink, running on Confluent Cloud, are used to move data around between services. The web
application doesn't know anything about LLMs, Kafka, or Flink.

The `research-agent` are API endpoints called by Confluent to consume messages from Kafka topics.
These APIs serve as agents for mining the research source material and generating a podcast brief.

<p align="center">
  <img src="/images/philip-example-bundle-processing.png" />
</p>

<p align="center">
  <img src="/images/philip-example-bundle-complete.png" />
</p>

# What you'll need
In order to set up and run PodPrep AI, you need the following:

* [Node v22.5.1](https://nodejs.org/en) or above
* A [MongoDB](https://www.mongodb.com/cloud/atlas/register) account
* A [Confluent Cloud](https://www.confluent.io/) account
* The [Confluent CLI](https://docs.confluent.io/confluent-cli/current/install.html)
* An [OpenAI](https://platform.openai.com/docs/overview) API key
* A [LangChain](https://www.langchain.com/) API key

## Getting set up

### Get the starter code
In a terminal, clone the PodPrep AI repo to your project's working directory with the following command:

```shell
git clone https://github.com/thefalc/podcast-research-agent.git
```

### Setting up MongoDB

In MongoDB create a database called `podpre_ai` with the following collections:

* `research_bundles` - Stores the research source information for the podcast.
  * `guestName` - String
  * `company` - String
  * `topic` - String
  * `urls` - Array
  * `context` - String
  * `processed` - Boolean
  * `created_date` - Date time
  * `researchBriefText` - String
* `text_embeddings` - Will contain the embeddings for a given research bundle
  * `bundleId`- String
  * `text` - String
  * `embedding` - Array
  * `url` - String
* `mined_questions` - will contain the questions extracted for a given research source
  * `bundleId` - String
  * `url` - String
  * `questions` - String

Create a search index for the `text_embeddings` collection. This is needed to make the RAG process
possible. The index will have a vector index on the `embedding` attribute and a filter on the `bundleId`.

* In Atlas, click the **Atlas Search** tab
* Click **+ CREATE SEARCH INDEX**
* Choose **JSON Editor** under **Atlas Vector Search** and click **Next**
* Copy the JSON below into the editor and click **Next**

```json
{
  "fields": [
    {
      "numDimensions": 1536,
      "path": "embedding",
      "similarity": "dotProduct",
      "type": "vector"
    },
    {
      "path": "bundleId",
      "type": "filter"
    }
  ]
}
```

Once the index is ready, you should see something like the image below.

<p align="center">
  <img src="/images/atlas-search-index.png" />
</p>

Before continuing, I suggest testing the PodPrep AI web application. 

### Configure and run the PodPrep AI web application

Go into your `web-application` folder and create a `.env` file with your MongoDB URI.

```bash
MONGODB_URI='mongodb+srv://USER:PASSWORD@CLUSTER_URI/?retryWrites=true&w=majority&appName=experiments-cluster'
```

Navigate into the `web-application` folder and run the application.

```bash
npm install
npm run dev
```

Go to `http://localhost:1080` and try creating a new research bundle. If everything looks good, then
continue with the setup.

### Setting up Confluent Cloud

PodPrep AI uses Kafka topics to move data around in real-time from the web application to the AI 
agent research flow. At a high-level, the architecture looks as follows.

<p align="center">
  <img src="/images/podprep-ai-architecture.png" />
</p>

### Create the MongoDB research request source connector

In order to kick start the agentic workflow, data from MongoDB needs to be published to Kafka. This
can be done by creating a MongoDB source connector.

In Confluent Cloud, create a new connector.

<p align="center">
  <img src="/images/confluent-cloud-overview.png" />
</p>

* Search for "mongodb" and select the **MongoDB Atlas Source**
* Enter a topic prefix as `podprep_ai.research_bundles`
* In **Kafka credentials**, select **Service account** and use an existing or create a new one
* In **Authentication,** enter your MongoDB connection details, the database name **podpre_ai** and a collection name of **research_bundles**
* Under **Configuration**, select **JSON**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `mongodb-research-bundles-connector` and click **Continue**

### Create the HTTP sink connector to process URLs and generate embeddings

Now that data is flowing from the application database into the `podprep_ai.research_bundles.podpre_ai.research_bundles` topic,
you now need to setup an HTTP sink connector to start the process URLs and generate embeddings agent.

* Under **Connectors**, click **+ Add Connector**
* Search for "http" and select the **HTTP Sink** connector
* Select the **podprep_ai.research_bundles.podpre_ai.research_bundles** topic
* In **Kafka credentials**, select **Service account** and use you existing service account and click **Continue**
* Enter the URL for where the `process-urls` endpoint is running under the `research-agent` folder. This will be
similar to `https://YOUR-PUBLIC-DOMAIN/api/process-urls`. If running locally, you can use [ngrok](https://ngrok.com/)
to create a publicly accessible URL. Click **Continue**
* Under **Configuration**, select **JSON** and click **Continue**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `research-bundle-processor-sink-connector` and click **Continue**

Once the connector is created, under the **Settings** > **Advanced configuration** make sure the **Request Body Format** is set to **json**.

### Create the text chunks topic

The `process-urls` endpoint publishes messages with the text chunks and embeddings to a Kafka topic
called `podprep-text-chunks-1`.

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `podprep-text-chunks-1`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **podprep-text-chunks-1** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "bundleId": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "embedding": {
      "connect.index": 3,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "items": {
            "oneOf": [
              {
                "type": "null"
              },
              {
                "connect.type": "float32",
                "type": "number"
              }
            ]
          },
          "type": "array"
        }
      ]
    },
    "text": {
      "connect.index": 2,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "url": {
      "connect.index": 1,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```

* Save the schema

### Create the full text topic

The `process-urls` endpoint publishes messages with the full text pulled from webpages and podcasts 
to a Kafka topic called `podprep-full-text-1`.

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `podprep-full-text-1`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **podprep-full-text-1** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "bundleId": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "content": {
      "connect.index": 2,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "url": {
      "connect.index": 1,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```
* Save the schema

### Create the MongoDB text embeddings sink connector

Messages from the `podprep-text-chunks-1` topic are synced via a MongoDB sink connector.

In your Confluent Cloud account.

* In your Kafka cluster, go to the **Connectors** tab
* Click on **+ Add Connector** and search for "mongodb"
* Select **MongoDB Atlas Sink** from the list, and enter the connector configuration details as follows
* Select the **podprep-text-chunks-1** topic
* In **Kafka credentials**, select **Service account** and use you existing service account and click **Continue**
* In **Authentication,** enter your MongoDB connection details, the database name **podpre_ai** and a collection name of **research_bundles**
* Under **Configuration**, select **JSON**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `mongodb-text-embeddings-connector-1` and click **Continue**

### Flink SQL and LLM setup

Flink SQL is used to extract questions from the messages in the `podprep-full-text-1` topic and to
start the generate research brief agent when all the research materials have been processed.

Before setting up Flink, we need to create two more Kafka topics for storing the questions extracted
from the text as we process the stream and for storing `bundleIds` associated with research bundles
that are ready to be have research briefs generated.

#### Creating the mined questions topic

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `podprep-mined-questions`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **podprep-mined-questions** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "bundleId": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "questions": {
      "connect.index": 2,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    },
    "url": {
      "connect.index": 1,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```

#### Creating the mined questions topic

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Topics** in the sidebar.
* Name the topic as `processed-research-bundles-1`.
* Set other configurations as needed, such as the number of partitions and replication factor, based on your requirements.
* Go to **Schema Registry**
* Click **Add Schema** and select **processed-research-bundles-1** as the subject
* Choose JSON Schema as the schema type
* Paste the schema from below into the editor

```json
{
  "properties": {
    "bundleId": {
      "connect.index": 0,
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "string"
        }
      ]
    }
  },
  "title": "Record",
  "type": "object"
}
```

#### Connecting Flink to OpenAI

To extract questions from the text pulled from the source URLs with Flink, we need to Flink to be
able to call a LLM. The first step is to create a connection between Flink and OpenAI (or whatever model you're using).

In your terminal, execute the following.

```bash
confluent flink connection create openai-connection \
--cloud aws \
--region us-east-1 \
--type openai \
--endpoint https://api.openai.com/v1/chat/completions \
--api-key REPLACE_WITH_YOUR_KEY
```

Make sure the region value matches the region for where you're running Confluent Cloud.

Next, in your Confluent Cloud account.

* In your Kafka cluster, go to the **Stream processing** tab
* Click **Create workspace**
* Create a model using the connection you created in the previous step

```sql
CREATE MODEL `question_generation`
INPUT (text STRING)
OUTPUT (response STRING)
WITH (
  'openai.connection'='openai-connection',
  'provider'='openai',
  'task'='text_generation',
  'openai.model_version' = 'gpt-3.5-turbo',
  'openai.system_prompt' = 'Extract the most interesting questions asked from the text. Paraphrase the questions and seperate each one by a blank line. Do not number the questions.'
);
```

* Click **Run**

#### Generate questions from full text

Now that the model is created, we are ready to use Flink's built-in `ml_predict` to call the 
model and generate questions from the source material.

In the same workspace where you created your model, enter the following and click **Run**. This
query will run continually against the `podprep-full-text-1` stream, generating questions based
on the source text.

```sql
INSERT INTO `podprep-mined-questions`
SELECT 
    `key`, 
    `bundleId`, 
    `url`, 
    q.response AS questions 
FROM 
    `podprep-full-text-1`,
    LATERAL TABLE (
        ml_predict('question_generation', content)
    ) AS q;
```

#### Complete processing and generate the research brief

Both the `podprep-text-chunks-1` and `podprep-mined-questions` topics are populating for each research
bundle but we need to know when the processing of given bundle is complete in order to generate the
research brief.

To do this, I'm populating the `processed-research-bundles-1` topic when both the number of unique
URLs in `podprep-mined-questions` for each bundle matches the number of unique URLs in `podprep-full-text-1`
for each bundle.

To set this up, in the same workspace where you created your model, enter the following and click **Run**.

```sql
INSERT INTO `processed-research-bundles-1`
SELECT '' AS id, pmq.bundleId
FROM (
    SELECT bundleId, COUNT(url) AS url_count_mined
    FROM `podprep-mined-questions`
    GROUP BY bundleId
) AS pmq
JOIN (
    SELECT bundleId, COUNT(url) AS url_count_full
    FROM `podprep-full-text-1`
    GROUP BY bundleId
) AS pft
ON pmq.bundleId = pft.bundleId
WHERE pmq.url_count_mined = pft.url_count_full;
```

### Creating the generate research brief connector

The final step to configuring Confluent Cloud is to create another HTTP sink connector that will
call the `generate-research-brief` API endpoint to build the brief.

<p align="center">
  <img src="/images/generate-research-bundle-flow.png" />
</p>

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Connectors** in the sidebar 
* Click **+ Add Connector**
* Search for "http" and select the **HTTP Sink** connector
* Select the **processed-research-bundles-1** topic
* In **Kafka credentials**, select **Service account** and use you existing service account and click **Continue**
* Enter the URL for where the `generate-research-brief` endpoint is running under the `research-agent` folder. This will be
similar to `https://YOUR-PUBLIC-DOMAIN/api/generate-research-brief`. If running locally, you can use [ngrok](https://ngrok.com/)
to create a publicly accessible URL. Click **Continue**
* Under **Configuration**, select **JSON** and click **Continue**
* For **Sizing**, leave the defaults and click **Continue**
* Name the connector `generate-research-brief-sink-connector` and click **Continue**

Once the connector is created, under the **Settings** > **Advanced configuration** make sure the **Request Body Format** is set to **json**.

### Configure the research agent project

In the `research-agents` directory, create a `.env` file with the following information.

```bash
MONGODB_URI='mongodb+srv://USER:PASSWORD@CLUSTER_URI/?retryWrites=true&w=majority&appName=experiments-cluster'
OPENAI_API_KEY='REPLACE_ME'
LANGCHAIN_TRACING_V2='true'
LANGCHAIN_API_KEY='REPLACE_ME'
```

In your Confluent Cloud account.

* Go to your Kafka cluster and click on **Clients** in the sidebar.
* Click on **Create Client** and select **Node.js**
* Generate a new API key and secret for your Kafka cluster if you haven't already. Make a note of the API key and secret, as you'll need these for authentication.
* Open a text editor, and create a file named client.properties.
* Copy the configuration snippet into your editor and save the file into the `research-agents` directory

## Run the agent

Deploy your application or if you're using ngrok, navigate into the `research-agent` folder and run the application.

```bash
npm install
npm run dev
```

If everything looks good, the `process-urls` endpoint should be called after you submit a new research
bundle in the web application and that will kick start the agentic workflow.