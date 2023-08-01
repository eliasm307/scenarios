// todo investigate further

export default function Select() {
  return <>Foo</>;
  // const voices = useAvailableVoices();
  // const voiceDropdownOptions = useMemo(() => {
  //   return voices.map((voice) => ({
  //     value: voice.name,
  //     label: `${voice.name}`,
  //     language: voice.lang,
  //     countryCode: voice.lang.split("-").pop()!,
  //   }));
  // }, [voices]);
  // return (
  //   <Select
  //     // key={voices.length}
  //     options={voiceDropdownOptions}
  //     // formatOptionLabel={(option: (typeof voiceDropdownOptions)[number], meta) => {}}
  //     components={{
  //       // eslint-disable-next-line react/no-unstable-nested-components
  //       Option: (props) => {
  //         console.log("format", props);
  //         return (
  //           <>
  //             <HStack ref={props.innerRef} mx={3} {...props.innerProps}>
  //               <Box width='2rem'>
  //                 <Flag code={props.data.countryCode} />
  //               </Box>{" "}
  //               <Text color='black' flex={1}>
  //                 {props.label}
  //               </Text>
  //             </HStack>
  //             <Divider backgroundColor='gray.50' my={3} />
  //           </>
  //         );
  //       },
  //     }}
  //     required
  //     title='Select to change reading voice'
  //     aria-label='Select to change reading voice'
  //     defaultValue={tempVoiceName || undefined}
  //     value={tempVoiceName || undefined}
  //     getOptionValue={(option) => option.value}
  //     onChange={(e) => setPreferredVoiceNameTemp(e)}
  //   >
  //     {/* {voices.map((voice) => (
  //   <option key={voice.name} value={voice.name} aria-label={voice.name}>
  //     <Flag code={voice.lang.split("-").pop()} /> {voice.name}
  //   </option>
  // ))} */}
  //   </Select>
  // );
}
