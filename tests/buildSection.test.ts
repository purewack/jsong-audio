import buildSection from "../src/sectionsBuild";

const defaults = {
  grain: 4,
  tracks: [
    "trackA",
    "trackB"
  ],
  fadeDuration: 4
};

test("Build sections from flow with section options and multiple repeats", () => {
  const map = {
    "intro": [0, 4] as [number,number],
    "A":     [4, 12] as [number,number],
    "verse": [12, 16] as  [number,number],
    "bass":  [16, 24] as  [number,number],
  }
  const flow = ["intro", [1,[2, 'A', {name:"verse", grain: 8}], "bass"]];
  const sections = buildSection(flow,map,defaults);

  expect(sections).toMatchObject({
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
    0: {name:"intro", index: [0], next: [1,0,0], region: [0, 4], grain: 4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
    1: {
      0: {
        0: {name:"A",     index: [1,0,0], next: [1,0,1], region: [4, 12], grain: 4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {name:"verse", index: [1,0,1], next: [1,1],   region: [12,16], grain: 8, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "bass", index: [1,1], next: [0], region: [16,24], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: 1,
      sectionCount: 2,
    }
  });
});

test("Build sections with overrides", () => {  
  const map = {
    "intro": [0, 4] as [number,number],
    "A":     [4, 12] as [number,number],
    "verse": [12, 16] as  [number,number],
    "bass":  [16, 24] as  [number,number],
  }
  const flow = ["intro->", [[2, {name:'A', grain:16}, "verse"], "A-x->", "bass"]];
  const sections = buildSection(flow,map,defaults);
 
  expect(sections).toMatchObject({
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
    0: {name:"intro", index: [0], next: [1,0,0], region:[0,4], grain:4 , once:true, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
    1: {
      0: {
        0: {name:"A",     index: [1,0,0], next: [1,0,1],  region:[4,12],  grain:16 , once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {name:"verse", index: [1,0,1], next: [1,1],    region:[12,16], grain:4 ,  once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "A",    index:[1,1],  next: [1,2],region:[4,12],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
      2: {name: "bass", index: [1,2], next: [0],  region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 3,
    },
  });
});


test("Build sections with overrides and deep start", () => {
  const map = {
    "A": [0, 4] as [number,number],
    "B": [4, 12] as [number,number],
    "C": [12, 16] as  [number,number],
    "V": [16, 24] as  [number,number],
  }
  const flow = [[[2, 'A', {name:"V->",fade:["trackA"]}], "A-x->", "B"], "C"];
  const sections = buildSection(flow,map,defaults);
 
  expect(sections).toMatchObject(
    {
      0: {
        0: {
          0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"V", index: [0,0,1], next: [0,1],   region:[16,24], grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 0,
          loopLimit: 2,
          sectionCount: 2,
        },
        1: {name: "A", index:[0,1],  next: [0,2], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
        2: {name: "B", index: [0,2], next: [1],   region:[4,12], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 3,
      },
      1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  );
});

test("Build far end sections inner loops", () => {
  const map = {
    "A": [0, 4] as [number,number],
    "B": [4, 12] as [number,number],
    "C": [12, 16] as  [number,number],
    "V": [16, 24] as  [number,number],
  }
  const flow = ["A",["A",["A","A"]]];
  const sections = buildSection(flow,map,defaults);
 
  expect(sections).toMatchObject(
    {
      0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      1: {
        0: {name:"A", index: [1,0], next: [1,1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {
          0: {name:"A", index: [1,1,0], next: [1,1,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"A", index: [1,1,1], next: [0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 0,
          loopLimit: Infinity,
          sectionCount: 2,
        },
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 2,
      },
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  );
});

test("Build padded sections inner loops", () => {
  const map = {
    "A": [0, 4] as [number,number],
    "B": [4, 12] as [number,number],
    "C": [12, 16] as  [number,number],
    "V": [16, 24] as  [number,number],
  }
  const flow = ["A",["A",["A","A",2],"B"],"B"];
  const sections = buildSection(flow,map,defaults);
 
  expect(sections).toMatchObject(
    {
      0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      1: {
        0: {name:"A", index: [1,0], next: [1,1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {
          0: {name:"A", index: [1,1,0], next: [1,1,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"A", index: [1,1,1], next: [1,2], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          
          loopCurrent: 0,
          loopLimit: 2,
          sectionCount: 2,
        },
        2: {name:"B", index: [1,2], next: [2], region:[4,12],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 3,
      }, 
      2: {name:"B", index: [2], next: [0], region:[4,12],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},

      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 3,
    }
  );
});

test("Build extensive transition instructions",()=>{
  const map = {
    "A": [0, 4] as [number,number],
  }
  const flow = [{name:"A",fade:[
    {name: "trackA", duration: 8},
    {name: "trackB", duration: 4}
  ]}];
  const sections = buildSection(flow,map,defaults);
  expect(sections).toMatchObject(
    {
      0: {name:"A", index:[0], next:[0], region: [0,4], grain:4, once:false, transition:[{name:"trackA",type:"fade",duration:8},{name:"trackB",type:"fade",duration:4}]},
      loopCurrent:0,
      loopLimit: Infinity,
      sectionCount:1,
    }
  )
})

test("Build weird single entry multi loop",()=>{
  const map = {
    "A": [0, 4] as [number,number],
  }
  const flow = [[3,[2,'A']]]
  const sections = buildSection(flow,map,defaults);
  expect(sections).toMatchObject(
    {
      0: {
        0: {
          0: {name:"A", index: [0,0,0], next: [0,0,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 0,
          loopLimit: 2,
          sectionCount: 1,
        },
        loopCurrent: 0,
        loopLimit: 3,
        sectionCount: 1,
      },
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 1,
    }
  )
})