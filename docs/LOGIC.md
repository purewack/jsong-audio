# Parsing from different states

Circle shapes are player states.

Solid lines indicate automatic progression, dashed/dotted lines are user actions.

The user can request to load a song at any time from any state of the player.

```mermaid
graph 
	
	created[[created]]
	created-->empty
	new(load new)
	empty((empty))
	parse((parsing))
	empty-.->new
	new-->parse-->checkNew{is loadable}
	checkNew--"yes"-->stopForParse[force stop]-->parseStop((stopped))
	checkNew--"no"-->checkLoaded
	checkLoaded{had song?}--"yes"-->currentState-.->new
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

# Player ready states
```mermaid
graph
	play((playing))
	stop((stopped))
	prestop((stopping))
	q((queue))
	next[next]
	cancel[cancel]
	
	play-.->q-->next
	q-.->cancel
	cancel-->play
	next-->play
	play-.->prestop
	prestop-->stop
	stop-.->play
```
