const { Kafka } = require("@confluentinc/kafka-javascript").KafkaJS;
const fs = require('fs');

// Configuration for for Kafka
const config = readConfig(process.cwd() + "/client.properties");
const topic = "podprep-text-chunks-1";

// Reads the Kafka config file
function readConfig(fileName) {
  const data = fs.readFileSync(fileName, "utf8").toString().split("\n");
  return data.reduce((config, line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      config[key] = value;
    }
    return config;
  }, {});
}

module.exports = {
  // Saves the text chunks, bundle IDs, and URLs to a Kafka topic
  saveTextChunks: async function(textChunks) {
    console.log('saveTextChunks');
    console.log(textChunks);

    // Create a new producer instance
    const producer = new Kafka().producer(config);

    // Connect the producer to the broker
    await producer.connect();

    // Convert the text chunks array into an array that can be sent to Kafka
    const messages = textChunks.map(item => ({ value: JSON.stringify(item) }));

    // Send a single message
    const produceRecord = await producer.send({
      topic,
      messages: messages
    });
    console.log(
      `\n\n Produced message to topic ${topic}: , ${JSON.stringify(
        produceRecord,
        null,
        2
      )} \n\n`
    );

    // Disconnect the producer
    await producer.disconnect();
  }
}