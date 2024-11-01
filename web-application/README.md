# Podcast Research Agent
This project is the consumer-facing web application for creating a podcast research brief.

Enter the URLs you want to use as source material including other podcast and Youtube links. This application
saves that data to MongoDB. Behind the scenes, Kafka kick starts the agentic process, pulling in the audio and text,
creating embeddings, and storing those in a vector database. The most relevant context
is passed to a LLM to generate a podcast brief and set of suggested questions.

## Configuring the application

You need to create a **.env** file with the following values:
* MONGODB_DB_USER
* MONGODB_DB_PWD

## Running the application

From the your terminal, navigate to the **/web-application** directory and enter the following command:

```shell
npm run dev
```