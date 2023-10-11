const {JSONPlayer} = require('../JSONPlayer')

const QuanTime = JSONPlayer.QuanTime

test('quantize time to nearest bar',()=>{
    expect(QuanTime('0:0:2',[4,4])).toBe('1:0:0')
    expect(QuanTime('0:1:2',[4,4])).toBe('1:0:0')
    expect(QuanTime('0:3:3',[4,4])).toBe('1:0:0')
    expect(QuanTime('1:0:2',[4,4])).toBe('2:0:0')
    expect(QuanTime('1:1:2',[4,4])).toBe('2:0:0')
    expect(QuanTime('1:3:3',[4,4])).toBe('2:0:0')
})

test('quantize time to nearest halfbar',()=>{
    expect(QuanTime('0:1:2',[2,4])).toBe('0:2:0')
    expect(QuanTime('0:0:2',[2,4])).toBe('0:2:0')
    expect(QuanTime('0:2:1',[2,4])).toBe('1:0:0')
    expect(QuanTime('0:3:3',[2,4])).toBe('1:0:0')
})

test('quantize time to nearest beat',()=>{
    expect(QuanTime('0:2:1',[1,4])).toBe('0:3:0')
    expect(QuanTime('0:1:2',[1,4])).toBe('0:2:0')
    expect(QuanTime('0:0:2',[1,4])).toBe('0:1:0')
})

test('quantize time to nearest 2bar',()=>{
    expect(QuanTime('0:1:2',[8,4])).toBe('2:0:0')
    expect(QuanTime('0:2:2',[8,4])).toBe('2:0:0')
    
    expect(QuanTime('1:1:2',[8,4])).toBe('3:0:0')
    expect(QuanTime('2:1:2',[8,4])).toBe('4:0:0')
    expect(QuanTime('3:1:2',[8,4])).toBe('5:0:0')
    expect(QuanTime('3:1:2',[8,4])).toBe('5:0:0')

    expect(QuanTime('0:2:2',[8,4],1)).toBe('3:0:0')
    expect(QuanTime('1:1:2',[8,4],0)).toBe('2:0:0')
})