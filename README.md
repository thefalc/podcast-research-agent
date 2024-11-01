# Podcast Research Agent
If you're a podcast host, this application does the topic and guest research for you. 

This project demonstrates how to create an AI-powered application that de-couples the data engineering and AI
parts of the service from the application tier. 

The project is split into two applications. The **web-application** is a NextJS application that uses
a standard three tier application stack consisting of a frontend written in React, a backend in Node,
and a MongoDB application database.

Kafka and Flink, running on Confluent Cloud, are used to move data around between services. The web
application doesn't know anything about LLMs, Kafka, or Flink.

The **http-sinks** are API endpoints called by Confluent to consume messages from Kafka topics. These
APIs serve as the data engineering pipeline to process URLs and convert the data into embeddings
to be used ot genreate a podcast research brief.