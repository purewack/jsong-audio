const {quanTime} = require('./quantime');

describe('Quantize time 4/4',()=>{

test('quantize time to nearest bar',()=>{
    expect(quanTime('0:0:2',4,[4,4])).toBe('1:0:0')
    expect(quanTime('0:1:2',4,[4,4])).toBe('1:0:0')
    expect(quanTime('0:3:3',4,[4,4])).toBe('1:0:0')
    expect(quanTime('1:0:2',4,[4,4])).toBe('2:0:0')
    expect(quanTime('1:1:2',4,[4,4])).toBe('2:0:0')
    expect(quanTime('1:3:3',4,[4,4])).toBe('2:0:0')
})

test('quantize time to nearest halfbar',()=>{
    expect(quanTime('0:1:2',2,[4,4])).toBe('0:2:0')
    expect(quanTime('0:0:2',2,[4,4])).toBe('0:2:0')
    expect(quanTime('0:2:1',2,[4,4])).toBe('1:0:0')
    expect(quanTime('0:3:3',2,[4,4])).toBe('1:0:0')
})

test('quantize time to nearest beat',()=>{
    expect(quanTime('0:2:1',1,[4,4])).toBe('0:3:0')
    expect(quanTime('0:1:2',1,[4,4])).toBe('0:2:0')
    expect(quanTime('0:0:2',1,[4,4])).toBe('0:1:0')
})

test('quantize time to nearest 2bar',()=>{
    expect(quanTime('0:1:2',8,[4,4])).toBe('2:0:0')
    expect(quanTime('0:2:2',8,[4,4])).toBe('2:0:0')
    
    expect(quanTime('1:1:2',8,[4,4])).toBe('3:0:0')
    expect(quanTime('2:1:2',8,[4,4])).toBe('4:0:0')
    expect(quanTime('3:1:2',8,[4,4])).toBe('5:0:0')
    expect(quanTime('3:1:2',8,[4,4])).toBe('5:0:0')
})


test('quantize time to nearest 2bar late gridAlign',()=>{
    expect(quanTime('2:1:2',8,[4,4],'2:0:0')).toBe('4:0:0')
    expect(quanTime('3:1:2',8,[4,4],'2:0:0')).toBe('4:0:0')
    expect(quanTime('3:3:3',8,[4,4],'2:0:0')).toBe('4:0:0')
    // expect(quanTime('3:3:3',8,[4,4],-2)).toBe('5:0:0')
})

test('quantize time to nearest 4bar late gridAlign',()=>{
    expect(quanTime('2:1:2',16,[4,4],'0:0:0')).toBe('4:0:0')
    expect(quanTime('3:1:2',16,[4,4],'0:0:0')).toBe('4:0:0')

    expect(quanTime('4:1:2',16,[4,4],'4:0:0')).toBe('8:0:0')
    expect(quanTime('5:2:0',16,[4,4],'4:0:0')).toBe('8:0:0')
    expect(quanTime('6:3:0',16,[4,4],'4:0:0')).toBe('8:0:0')
    expect(quanTime('7:2:0',16,[4,4],'4:0:0')).toBe('8:0:0')

    expect(quanTime('2:3:3',16,[4,4],'2:0:0')).toBe('6:0:0')
    expect(quanTime('4:3:3',16,[4,4],'2:0:0')).toBe('6:0:0')
    expect(quanTime('5:3:3',16,[4,4],'2:0:0')).toBe('6:0:0')
})

test('quantize time to nearest 4bar late gridAlign multiple loops already',()=>{
    expect(quanTime('8:3:3', 16,[4,4],'2:0:0')).toBe('10:0:0')
    expect(quanTime('10:3:3',16,[4,4],'2:0:0')).toBe('14:0:0')
    expect(quanTime('13:3:3',16,[4,4],'2:0:0')).toBe('14:0:0')
})

})


describe('Quantize time 3/4',()=>{

    test('quantize time to nearest bar',()=>{
        expect(quanTime('0:0:2',3,[3,4])).toBe('1:0:0')
        expect(quanTime('0:1:2',3,[3,4])).toBe('1:0:0')
        expect(quanTime('0:2:3',3,[3,4])).toBe('1:0:0')
        expect(quanTime('1:0:2',3,[3,4])).toBe('2:0:0')
        expect(quanTime('1:1:2',3,[3,4])).toBe('2:0:0')
        expect(quanTime('1:2:3',3,[3,4])).toBe('2:0:0')
        expect(quanTime('13:1:2.163', 3, [3,4])).toBe('14:0:0')
    })    
    
    test('quantize time to nearest 2bar',()=>{
        expect(quanTime('0:1:2',6,[3,4])).toBe('2:0:0')
        expect(quanTime('0:2:2',6,[3,4])).toBe('2:0:0')
        
        expect(quanTime('1:1:2',6,[3,4])).toBe('3:0:0')
        expect(quanTime('2:1:2',6,[3,4])).toBe('4:0:0')
        expect(quanTime('3:1:2',6,[3,4])).toBe('5:0:0')
        expect(quanTime('3:1:2',6,[3,4])).toBe('5:0:0')
    
        expect(quanTime('0:2:2',6,[3,4],1)).toBe('3:0:0')
        expect(quanTime('1:1:2',6,[3,4],0)).toBe('2:0:0')
    })
})