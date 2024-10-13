# Parsing from different states

Available player states are:
 - `null`: No media is loaded or the player is uninitialized.
 - `"applying"`: The player is applying parsed media information.
 - `"loading"`: The player is currently loading media buffers.
 - `"stopped"`: Playback has been stopped and is ready to play media.
 - `"playing"`: The player is actively playing media.
 - `"queue"`: A next section is queued for playback. This state will revert to `playing` after the new section takes place.
 - `"transition"`: The player is transitioning from 'current' to 'next' sections if tracks are fading.
 - `"stopping"`: The player is in the process of stopping playback.


In the following state diagrams:
- circle shapes are player states.
- Solid lines indicate automatic progression, dashed/dotted lines are user actions.
- The user can request to load a song at any time from any state of the player.


# Parse and load
```mermaid
graph 
	
	created[[created]]
	created-->empty
	new(load new)
	empty((empty))
	parse((parsing))
	empty-."parse()".->new
	new-->parse-->checkNew{is loadable}
	checkNew--"yes"-->stopForParse[force stop]-->parseStop((stopped))
	checkNew--"no"-->checkLoaded
	checkLoaded{had song?}--"yes"-->currentState-."parse()".->new
	checkLoaded--"no"-->empty

```

# Path resolution

```mermaid
graph
	start((start))-.-> parseObject & parseString & parseFolder
	parseObject[["parse(object)"]];
	parseString[["parse(file:string)"]];
	parseFolder[["parse(folder:string)"]];
	throw[[throw error]];
	return[[return manifest]];

	checkExist & checkExistPrefix  
	--"yes"-->makeBaseURL-->parseObject;
	
	
subgraph preParse
	parseString-->checkExist{exists?};
	
	parseFolder-->tryPrefix[try next prefix];
	tryPrefix-->checkExistPrefix{exists?};
	lastPrefix--"no"-->tryPrefix;
	checkExistPrefix--"no"-->lastPrefix{last prefix?};

end

	parseObject-->checkVer{version?};
	checkVer--"ok"-->checkSource{sources?};
	checkSource--"ok"-->getPaths(get source paths);
	getPaths--"ok"-->checkData;


subgraph fetch
	checkData{data:uri?}--"yes"-->use;
	checkData--"no"-->checkRel{relative?}--"yes"-->prepend;
	prepend("add baseURL")-->use;
	checkRel--"no"-->use("fetch()");
end
	use-->return;
	
	lastPrefix--"yes"-->throw
	checkExist--"no"-->throw
	checkVer--"no"-->throw
	checkSource--"no"-->throw
	use--"fail"-->throw
```

# Check Path
```mermaid
graph
	start("start(url)")-->url[[URL string]]
	url-->jsong{".jsong?"}
	jsong--"yes"-->endFile
	
	jsong--"no"-->json{".json?"}
	json--"yes"-->endFile[found file]
	json--"no"-->folder{"ends in / ?"}
	
	folder--"yes"-->endFolder[found folder]
	folder--"no"-->append["append /"]-->endFolder

	endFolder & endFile -->preCheck
	preCheck{"absolute URL?"};
	
	preCheck--"no"-->prepend["prepend base URL"]
	prepend-->done;
	preCheck--"yes"-->done(done)
```

# Player ready states
```mermaid
graph
	play((playing))
	stop((stopped))
	prestop((stopping))
	q((queue))
	next[next]
	cancel[cancel]
	
	play-."play()".->q-->next
	q-."cancel()".->cancel
	cancel-->play
	next-->play
	play-.->prestop
	prestop-->stop
	stop-.->play
```

## More complete states
```mermaid
graph BT

	created[[created]]
	empty{{empty}}
	parse{{parsing...}}
	load{{loading...}}

	created-->empty-.->new
	new-->checkNew{Check if loadable}-->stopForParse[force stop]
	parsed-."any".->new(load new)
	stopForParse-->parse
	
	parse-->load--"ok"-->stop
	load--"error"-->empty
		
	subgraph parsed
		play{{playing...}}
		stop{{stopped}}
		prestop{{stopping...}}
		q{{queue...}}
		next{{next...}}
		cancel{{cancel check}}
		

	next-->next
		play-.->q-->cancel
		cancel-."yes".->play
		cancel--"no"-->next-->play
		play-.->prestop
		prestop-->stop
		stop-.->play
	end
```



