# Podcast Research Agent Web Application

This project is the consumer-facing web application for creating a podcast research brief.

Enter the URLs you want to use as source material including other podcast and Youtube links. This application
saves that data to MongoDB. Behind the scenes, Kafka kick starts the agentic process, pulling in the audio and text,
creating embeddings, and storing those in a vector database. The most relevant context
is passed to a LLM to generate a podcast brief and set of suggested questions.

Refer to the main `README.md` for detailed instructions in how to setup and configure this application.

## Configuring the application

You need to create a `.env` file with the following values:
* MONGODB_URI

## Running the application

From the your terminal, navigate to the `/web-application` directory and enter the following command:

```shell
npm install
npm run dev
```