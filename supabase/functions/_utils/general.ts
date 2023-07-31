/* eslint-disable no-console */
export async function streamAndPersist<StreamOutput>({
  persistenceEntityName,
  streamValueName,
  stream,
  persistLatestValue,
}: {
  /** ie readable name of what entity the stream value is getting persisted to */
  persistenceEntityName: string;
  /** ie readable name of what value the stream is producing */
  streamValueName: string;
  stream: AsyncIterable<StreamOutput>;
  persistLatestValue: (latestValue: StreamOutput) => Promise<unknown> | unknown;
}): Promise<void> {
  let latestValue: StreamOutput | undefined;
  let persistedValue: StreamOutput | undefined;

  console.log(`creating "${persistenceEntityName}" update interval`);
  let count = 1;
  const intervalId = setInterval(async () => {
    console.log(`"${persistenceEntityName}" update interval call`, count++);
    if (latestValue && latestValue !== persistedValue) {
      // only persist if we have a new value from the stream
      await persistLatestValue(latestValue);
      persistedValue = latestValue;
    }
  }, 100);

  console.log(`starting "${streamValueName}" stream`);
  for await (const scenarios of stream) {
    latestValue = scenarios;
  }
  clearInterval(intervalId);
  console.log(
    `${streamValueName} stream ended, new scenarios`,
    JSON.stringify(latestValue, null, 2),
  );

  // make sure we are up to date
  // ! not providing a way for UI to know when this is done, assuming users will wait for scenarios to finishing generating
  if (latestValue) {
    await persistLatestValue(latestValue);
  }

  console.log(`"${streamValueName}" stream complete, final value:`, latestValue);
}
