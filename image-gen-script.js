const { HfInference } = require("@huggingface/inference");
const fs = require("fs");

(async () => {
  const inference = new HfInference();

  // see https://huggingface.co/docs/huggingface.js/inference/classes/HfInference#texttoimage
  const result = await inference.textToImage(
    {
      // model: "stabilityai/stable-diffusion-xl-base-0.9",
      model: "stabilityai/stable-diffusion-2-1",
      inputs:
        "Intriguing, high-resolution image of a middle-aged musician against an array of digital screens illuminating his weary face. On one screen is an advanced AI entity generating mesmerizing music compositions based on his works. Around him are symbols of a waning career and looming struggle: a neglected guitar, dwindling concert tickets, and unopened bills. The two worlds contrasting, coaxing conversation on both traditional music creation methods vs Ai generated compositions and raising privacy concerns around cloud storage. Featured on popular technology and music artist platforms alike.",
      // "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
      parameters: {
        negative_prompt: "blurry",
      },
    },
    {
      use_cache: false,
      retry_on_error: true,
    },
  );

  console.log("prompt result", result);

  const buffer = Buffer.from(await result.arrayBuffer());
  await new Promise((resolve, reject) => {
    fs.createWriteStream("output.jpeg").write(buffer, (error) => {
      if (error) {
        console.error("error saving jpeg", error);
        reject(error);
        return;
      }
      console.log("jpeg saved!", error);
      resolve();
    });
  });
  debugger;
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then((result) => {
    console.log(result);
    process.exit(0);
  });
