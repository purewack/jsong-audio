import {beatTransportDelta} from "../src/timing"

test('simple 4/4 time',()=>{
    expect(beatTransportDelta('1:2:0','2:1:0',[4,4])).toBe(3)
    expect(beatTransportDelta('1:2:2.3','2:1:0',[4,4])).toBe(3)
    expect(beatTransportDelta('1:2:0','1:3:0',[4,4])).toBe(1)
    expect(beatTransportDelta('2:2:0','2:0:0',[4,4])).toBe(-2)
})

test('odd 5/4 time',()=>{
    expect(beatTransportDelta('1:2:0','2:1:0',[5,4])).toBe(4)
    expect(beatTransportDelta('1:2:2.3','2:1:0',[5,4])).toBe(4)
    expect(beatTransportDelta('1:2:0','1:3:0',[5,4])).toBe(1)
    expect(beatTransportDelta('2:2:0','2:0:0',[5,4])).toBe(-2)
})

test('common 6/8 time',()=>{
    expect(beatTransportDelta('1:2:0','2:1:0',[6,8])).toBe(5)
    expect(beatTransportDelta('1:2:2.3','2:1:0',[6,8])).toBe(5)
    expect(beatTransportDelta('1:2:0','1:3:0',[6,8])).toBe(1)
    expect(beatTransportDelta('2:2:0','2:0:0',[7,8])).toBe(-2)
})

test('common 3/4 time',()=>{
    expect(beatTransportDelta('1:2:0','2:1:0',[3,4])).toBe(2)
    expect(beatTransportDelta('1:2:2.3','2:1:0',[3,4])).toBe(2)
    expect(beatTransportDelta('2:2:0','2:0:0',[3,4])).toBe(-2)
    expect(beatTransportDelta('1:1:0','1:2:0',[3,4])).toBe(1)
})

test('complex 7/8 time',()=>{
    expect(beatTransportDelta('1:0:0','2:0:0',[7,8])).toBe(7)
    expect(beatTransportDelta('1:1:2.3','2:0:0',[7,8])).toBe(6)
    expect(beatTransportDelta('1:0:1','2:1:0',[7,8])).toBe(8)
    expect(beatTransportDelta('1:1:0','1:2:0',[7,8])).toBe(1)
})