
const {toMili,toMinutes,getRandomPositions} = require("./utilities");

//------VARIABLES---------
let timeMatrix=[];
let population=[];
let bestIndividual = {};
let date;
let pois;
let lunch_start;
let lunch_end;




function getFitness(individual){ //calculate fitness value of any individual
    var duration = timeMatrix[0][individual[1]].duration;
    var total = duration + pois[individual[individual.length-1]].expected_time;
    var hours = new Date(date);

    for(var i=1;i<individual.length-1;i++){
        duration = timeMatrix[individual[i]][individual[i+1]].duration;
        let expected_time = parseFloat(pois[individual[i]].expected_time);
        //get penalties
        let penalties = getPenalties(hours,pois[individual[i]]);
        setTime(hours,expected_time);
        //add time duration to arrive to the next poi
        setTime(hours,duration);

        //lunch time invaded
        if(hours.getTime() >= lunch_start && hours.getTime() < lunch_end){
            setTime(hours,60);
            total+=toMinutes(lunch_end-hours.getTime());
        }

        //add total
        total+= expected_time+duration+penalties;
    }

    return 480 - total;

    function setTime(date,duration){
        date.setTime(date.getTime()+toMili(duration));
    }

    function getPenalties(date,poi) {
        const time = date.getTime();
        var open;
        var close;
        try{
            //open
            open = poi.opening_hours.periods[date.getDay()].open.split('');
            open = new Date(`${date.toDateString().split(' ').splice(1,3).join(' ')} ${open[0]}${open[1]}:${open[2]}${open[3]}:00`);
            open = open.getTime();
            //close
            close = poi.opening_hours.periods[date.getDay()].close.split('');
            close = new Date(date.toDateString().split(' ').splice(1,3).join(' ')+` ${close[0]}${close[1]}:${close[2]}${close[3]}:00`);
            close = close.getTime();
        }catch(err) {
            //open
            open = new Date(`${date.toDateString().split(' ').splice(1,3).join(' ')} 10:00:00`);
            open = open.getTime();
            //close
            close = new Date(`${date.toDateString().split(' ').splice(1,3).join(' ')} 17:00:00`);
            close = close.getTime();
        }
        if(!(time >= open && time < close)){
            return time < open ? toMinutes(open - time) : toMinutes(time - close);
        }
        return 0;
    }
}


function sort() {//sort population according to Fitness value of individuals
    population.sort(function(a, b) {
        return a.fitness - b.fitness;
    });
    var best = population[population.length-1];
    // bestIndividual =  best.fitness < bestIndividual.fitness ? best : bestIndividual;
    if(best.fitness > bestIndividual.fitness){
        bestIndividual = best;
    }
}

function initPopulation(totalPOIS,size) {
    population=[];
    var total = totalPOIS-1;
    for(var i=0;i<size;i++){
        var route = [0].concat(getRandomPositions(total,1,total));
        population[i] = {
            route:route,
            fitness:getFitness(route)
        }
    }
}

function selection(parentsSize) { //select individuals to crossover
    const others=~~(parentsSize/5);
    const best=parentsSize-others;
    const start=Math.floor(Math.random()*(population.length-(best+others)));
    const randomIndividuals=population.slice(start,start+others);
    return randomIndividuals.concat(population.slice(population.length-(best+1),population.length-1));
    // return population.slice(population.length-(parentsSize+1),population.length-1);
}

function crossoverAllParents(parents) {
    var newPopulation = [];
    var usedParents=[];
    var total=parents.length;
    while(usedParents.length!==total){
        var positions = parents.length === 2 ? [0,1] : getRandomPositions(2,0,parents.length-1); //random positions
        var parent1 = parents[positions[0]], parent2 = parents[positions[1]];
        usedParents.push(parent1);
        usedParents.push(parent2);

        if(positions[0]>positions[1]){
            parents.splice(positions[0],1);
            parents.splice(positions[1],1);
        }else{
            parents.splice(positions[1],1);
            parents.splice(positions[0],1);
        }

        var routes = crossover(parent1.route,parent2.route);
        for(var i in routes){
            newPopulation.push({
                route: routes[i],
                fitness: getFitness(routes[i])
            });
        }
    }
    population = newPopulation.concat(usedParents);

    function crossover(parent1,parent2){
        [even, odd] = getPositionsAndMaps();
        return crossoverPoints(even).concat(crossoverPoints(odd));

        function crossoverPoints(parameters) {
            [positions,maps]=parameters;
            let childs=[[0],[0]];
            for(var i =1;i<parent1.length;i++){
                if(positions.includes(i)){
                    childs[0][i]=parent1[i];
                    childs[1][i]=parent2[i];
                }else{
                    childs[0][i]= maps[0][parent2[i]] !== undefined ? maps[0][parent2[i]] : parent2[i];
                    childs[1][i]= maps[1][parent1[i]] !== undefined ? maps[1][parent1[i]] : parent1[i];
                }
            }
            return childs;
        }
        function getPositionsAndMaps(){ //return the positions of chromosomes and points to be mapped
            const evenPositions=[],oddPositions=[];
            const evenPoints=[[],[]],oddPoints=[[],[]];
            for(var i=1;i<=parent1.length-1;i+=2){
                //even
                evenPoints[0].push(parent1[i]);
                evenPoints[1].push(parent2[i]);
                evenPositions.push(i);
                //odd
                oddPoints[0].push(parent1[i+1]);
                oddPoints[1].push(parent2[i+1]);
                oddPositions.push(i+1);
            }
            var last=oddPoints[0].length-1;
            if(oddPoints[0][last]===undefined){
                oddPoints[0].splice(last,1);
                oddPoints[1].splice(last,1);
                oddPositions.splice(last,1);
            }
            return [[evenPositions,getMaps(evenPoints)],[oddPositions,getMaps(oddPoints)]];
        }
        function getMaps(points){ //return the points to be mapped
            [ar1,ar2]=points;
            for(var i=0;i<ar1.length;++i){
                const index=ar2.indexOf(ar1[i]);
                if(index!==-1){
                    ar2[index]=ar2[i];
                    ar1.splice(i,1);
                    ar2.splice(i,1);
                    i--;
                }
            }
            const m1={},m2={};
            for(i in ar1){
                m1[ar1[i]]=ar2[i];
                m2[ar2[i]]=ar1[i];
            }
            return[m1,m2];
        }
    }
}

function mutation(mutation_probability) {
    function mutate(individual){
        var route = individual.route;
        var positions = getRandomPositions(Math.floor((route.length-1)/2),1,route.length-1);
        for(var p=0;p<positions.length-1;p+=2){
            var aux=route[positions[p]];
            route[positions[p]]=route[positions[p+1]];
            route[positions[p+1]]=aux;
        }
        individual.fitness=getFitness(route);
    }

    population.forEach(function(individual){
        if(Math.random() < mutation_probability ){
            mutate(individual);
        }
    });
}

function initBestIndividual(totalPOIS) {
    var route=[];
    for(var i=0; i < totalPOIS; i++){
        route.push(i);
    }
    bestIndividual = {
        route:route,
        fitness:getFitness(route)
    }
}

module.exports = {
    evolve : function (parameters) {
        const crossover_probability = 1/3;
        var total = Math.ceil(parameters.sizePopulation*crossover_probability);
        var parentsSize = total % 2 === 0 ? total : total+1;
        timeMatrix = parameters.timeMatrix;
        date = parameters.date;
        lunch_start = date.getTime()+(3*3600*1000);
        lunch_end = lunch_start+(3600*1000);

        pois = parameters.pois;
        //---EVOLVE---
        initBestIndividual(pois.length);
        initPopulation(pois.length,parameters.sizePopulation);
        sort();
        for(var i=0;i<parameters.totalGenerations;i++){
            crossoverAllParents(selection(parentsSize));
            mutation(parameters.mutation_rate);
            sort();
        }

        return getSchedule(bestIndividual.route);
    }
};



function getSchedule(individual){
    var duration = timeMatrix[0][individual[1]].duration;
    var schedule = [];
    var hours = new Date(date);

    var time_ini = new Date(date);
    time_ini.setTime(date.getTime()-(duration*60*1000));

    //location User
    schedule.push({poi:pois[0]});
    //---ROUTE TO FIRST POI---
    schedule.push({
        route:timeMatrix[0][individual[1]].points,
        departure: time_ini.toTimeString().split(' ')[0],
        arrival: date.toTimeString().split(' ')[0]
    });

    for(var i=1;i<individual.length-1;i++){
        duration = timeMatrix[individual[i]][individual[i+1]].duration;
        const expected_time = parseFloat(pois[individual[i]].expected_time);

        //visit time to POI
        const visit_time = {poi:pois[individual[i]]}

        //route to next POI
        const next = {route:timeMatrix[individual[i]][individual[i+1]].points}

        //POI expected visit time
        setTime(hours,expected_time,visit_time);
        schedule.push(visit_time);

        //time to travel to de next POI
        setTime(hours,duration,next);
        schedule.push(next);

        //lunch time
        if(hours.getTime() >= lunch_start && hours.getTime() < lunch_end){
            const lunch_time = {lunch:true,location:pois[individual[i+1]].location};
            setTime(hours,60,lunch_time);
            schedule.push(lunch_time);
        }
    }
    const last={poi:pois[individual[individual.length-1]]};
    setTime(hours,pois[individual[individual.length-1]].expected_time,last);
    schedule.push(last);

    return schedule;

    function setTime(date,duration,obj){
        obj.start=date.toTimeString().split(":", 2).join(':');
        date.setTime(date.getTime()+(duration*60*1000));
        obj.end=date.toTimeString().split(":", 2).join(':');
    }
}
