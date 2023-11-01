
function golfApp(appElement){
    function getAvailableGolfCourses() {
        return fetch(
            "https://exquisite-pastelito-9d4dd1.netlify.app/golfapi/courses.json"
        ).then(function(response){
            return response.json();
        }, function(){
            return null;
        });
    }
    function getGolfCourseDetails(golfCourseId) {
        return fetch(
            `https://exquisite-pastelito-9d4dd1.netlify.app/golfapi/course${golfCourseId}.json`
        ).then(function(response){
            return response.json();
        }, function(){
            return null;
        });
    }

    class OnReadyResponse {
        constructor(successFn=()=>{}){
            this.successFn = successFn;
        }
        respond(...args){
            this.successFn(...args);
        }
    }

    class TeeColorType {
        static unique(data, ref){
            ref = ref.teeColorType;
            let id = data.teeColorTypeId;
            
            if(!(id in ref.ids)){
                let type = data.teeColorType;
                ref.types[type] = new this(data);
                ref.ids[id] = type;
            }
            return ref.types[ref.ids[id]];
        }
        constructor(data){
            this.type = data.teeColorType;
            this.id = data.teeColorTypeId;
            this.hex = data.teeHexColor
        }
    }

    class TeeType {
        static unique(data, reference){
            let ref = reference.teeType;
            let id = data.teeTypeId;
            if(!(id in ref.ids)){
                let type = data.teeType;
                ref.types[type] = new this(data, reference);
                ref.ids[id] = type;
            }
            return ref.types[ref.ids[id]];
        }
        constructor(data, ref){
            this.color = TeeColorType.unique(data, ref);
            this.type = data.teeType;
            this.id = data.teeTypeId;
        }
    }

    class TeeBoxData {
        constructor(data, ref){
            this.typeData = TeeType.unique(data, ref);
            this.data = data;
        }
        get type(){
            return this.typeData.type;
        }
    }

    class GolfHoleData {
        constructor(data, ref){
            this.teeBoxes = {};
            this.data = data;
            this.hole = data.hole;
            for(let teeBox of data.teeBoxes){
                teeBox = new TeeBoxData(teeBox, ref);
                this.teeBoxes[teeBox.type] = teeBox;
            }
        }
    }

    class GolfCourseData {
        constructor(data){
            this.baseData = data;
            this.success = false;
            this.finished = false;
            this.data = null;
            this.responses = [];
            golfCourseByName.set(data.name, this);
            this.golfHoles = {};
            this.ref = {
                teeType: {
                    types: {},
                    ids: {}
                },
                teeColorType: {
                    types: {},
                    ids: {}
                }
            }
        }
        async fetchData(){
            if(this.success) return this.success;
            this.finished = false;
            if(this.baseData && ("id" in this.baseData)){
                this.data = await getGolfCourseDetails(this.baseData.id);
            }
            if(this.data){
                this.success = true;
            }
            this.configData();
            this.finished = true;
            if(this.success){
                for(let response of this.responses){
                    if(!response[1].cancled){
                        response[0].respond(this);
                    }
                }
                this.responses = [];
            }
            return this.success;
        }
        async createInfoPage(){
            if(!this.infoPage) this.infoPage = new GolfCourseInfoPage(this, appElement);
        }
        configData(){
            if(this.data.holes){
                for(let i in this.data.holes){
                    let golfHoleData = new GolfHoleData(this.data.holes[i], this.ref);
                    this.golfHoles[golfHoleData.hole] = golfHoleData;
                }
            }
        }
        onReady(fn){
            if(this.finished && this.success){
                fn();
                return null;
            } else {
                let response = new OnReadyResponse(fn);
                let handle = {};
                this.responses.push([response, handle]);
                return handle;
            }
            
        }
        hasTeeType(type){
            return type in this.ref.teeType.types;
        }
        hasTeeColorType(type){
            return type in this.ref.teeColorType.types;
        }
        get teeTypes(){
            let teeTypes = [];
            for(let i in this.ref.teeType.types){
                teeTypes.push(i);
            }
            return teeTypes;
        }
        get teeColorTypes(){
            let teeColorTypes = [];
            for(let i in this.ref.teeColorType.types){
                teeColorTypes.push(i);
            }
            return teeColorTypes;
        }
    }

    function removeElement(element){
        element.parentElement.removeChild(element);
    }

    let containerElement = document.createElement("div");
    class ElementI {
        constructor(element, frontElement, backElement){
            if(element instanceof ElementI){
                if(frontElement === undefined){
                    frontElement = element.frontElement;
                }
                if(backElement === undefined){
                    backElement = element.backElement;
                }
                element = element.element;
            }
            frontElement = frontElement || element.parentElement;
            backElement = backElement || containerElement;
            if(frontElement instanceof ElementI){
                frontElement = frontElement.element;
            }
            if(backElement instanceof ElementI){
                backElement = backElement.element;
            }
            this.element = element;
            this.frontElement = frontElement;
            this.backElement = backElement;
        }
        toFront(){
            this.frontElement.appendChild(this.element);
            this.inBack = false;
        }
        toBack(){
            this.backElement.appendChild(this.element);
            this.inBack = true;
        }
        toElement(element){
            this.frontElement = element;
            if(!this.inBack){
                this.toFront();
            }
        }
        show(){
            if(this.element.style.display === "none"){
                this.element.style.display = this.defaultDisplay || "";
            }
        }
        hide(){
            if(this.element.style.display !== "none"){
                this.defaultDisplay = this.element.style.display;
                this.element.style.display = "none";
            }
        }
        remove(){
            removeElement(this.element);
        }
        clone(){
            return this.element.cloneNode(true);
        }
        apply(token){
            if(token[0] === "-"){
                if(token[1] === "."){
                    this.element.classList.remove(token.slice(2));
                }
            } else {
                if(token[0] === "."){
                    this.element.classList.add(token.slice(1));
                }
            }
        }
        add(element){
            if(element instanceof ElementI){
                element = element.element;
            }
            this.element.appendChild(element);
        }
        clear(){
            while(this.element.firstChild){
                this.element.removeChild(this.element.firstChild);
            }
        }
        set text(text){
            this.element.innerText = text;
        }
        get text(){
            return this.element.innerText;
        }
        set value(value){
            if("value" in this.element){
                this.element.value = value;
            } else {
                this.element.innerText = value;
            }
        }
        get value(){
            if("value" in this.element){
                return this.element.value;
            } else {
                return this.element.innerText;
            }
        }
        focus(){
            this.element.focus();
            return this;
        }
        select(){
            if(this.element.select){
                this.element.select();
            } else {
                window.getSelection().selectAllChildren(this.element);
            }
        }
        startEdit(){
            if(this.interactive){
                this.element.contentEditable = true;
                this.focus()
                this.select();
            }
        }
        endEdit(){
            let value = this.element.innerText;
            this.element.contentEditable = false;
            return value;
        }
    }

    class GolfScorePage extends ElementI {
        constructor(data, options, frontElement, backElement){
            let element = app.model.golfScorePage.page.clone();
            super(element, frontElement, backElement);
            this.innerElement = new ElementI(app.model.golfScorePage.content.main.clone(), element);
            this.loadElement = new ElementI(app.model.golfScorePage.content.load.clone(), element);
            this.data = data;
            this.options = options;
            this.innerElement.toBack();
            this.loadElement.toFront();
            this.load();
        }
        async load(){
            if(this.hasLoad) return;
            let success = await this.data.fetchData();
            if(!success) return false;
            this.loadElement.remove();
            this.loadElement = null;
            this.innerElement.toFront();
            this.create();
            this.hasLoad = true;
            return true;
        }
        create(){
            class TotalSumField {
                constructor(){
                    this.outs = [];
                    this.ins = [];
                    this.outTotals = [];
                    this.inTotals = [];
                    this.totals = [];
                }
                update(){
                    // deliberatly making NaN so it is known there is no score yet
                    // allowing a placeholder value instead (adding a progressive feel)
                    let outTotal = NaN;
                    for(let item of this.outs){
                        if(isFinite(item.score)){
                            outTotal = (outTotal || 0) + item.score;
                        }
                    }
                    let inTotal = NaN;
                    for(let item of this.ins){
                        if(isFinite(item.score)){
                            inTotal = (inTotal || 0) + item.score;
                        }
                    }
                    let total = outTotal + inTotal;
                    for(let item of this.outTotals){
                        item.score = outTotal;
                    }
                    for(let item of this.inTotals){
                        item.score = inTotal;
                    }
                    for(let item of this.totals){
                        item.score = total;
                    }
                }
                add(item, type){
                    switch(type){
                        case "out":
                            this.outs.push(item);
                            break;
                        case "in":
                            this.ins.push(item);
                            break;
                    }
                }
                addTotal(item, type){
                    switch(type){
                        case "out": 
                            this.outTotals.push(item);
                            break;
                        case "in":
                            this.inTotals.push(item);
                            break;
                        case "total":
                            this.totals.push(item);
                            break;
                    }
                }
            }
            let fields = {
                yardage: new TotalSumField(),
                par: new TotalSumField(),
                player: {}
            }

            const ROW_SIZE = 256;
            const GROUP_SIZE = 64;

            this.table = new ScoreTable(this, function(item){
                // categories
                let cat1 = item.id[1];
                let cat2 = item.id[0];
                let prop = {};
                let order = 1;
                if(typeof cat2 === "number"){
                    prop.hole = true;
                    prop.holeNumber = cat2;
                    order += cat2 * ROW_SIZE;
                    if(cat2 <= 9){
                        prop.holeType = "out";
                    } else {
                        prop.holeType = "in";
                        order += ROW_SIZE * 2;
                    }
                } else {
                    switch(cat2){
                        case "spec":
                            prop.spec = true;
                        break;
                        case "total":
                            order += ROW_SIZE;
                        case "in":
                            order += ROW_SIZE*10;
                        case "out":
                            order += ROW_SIZE*11;
                            prop.totalType = cat2;
                        break;
                    }
                }
                if(typeof cat1 === "number"){
                    prop.player = true;
                    prop.playerNum = cat1;
                    order += GROUP_SIZE*2 + cat1;
                    if(!prop.spec){
                        prop.isScore = true;
                    }
                } else {
                    switch(cat1){
                        case "hole":
                            order -= 1;
                        case "yardage":
                            order -= 1;
                        case "par":
                            if(!prop.spec){
                                prop.isScore = true;
                            }
                            order -= 1;
                        case "handicap":
                            if(!prop.spec){
                                prop.info = true;
                            }
                            order += 3;
                            prop.specType = cat1;
                        break;
                    }
                }
                
                if(prop.player && prop.spec){
                    prop.playerName = true;
                    prop.initialValue = "Player" + prop.playerNum;
                }
                if(prop.player && prop.hole || prop.playerName){
                    prop.editable = true;
                }
                if(prop.player && prop.hole){
                    prop.initialValue = "-";
                }
                if(prop.hole && prop.info){
                    prop.data = true;
                }
                if(prop.spec && prop.specType && !prop.player){
                    let label = prop.specType
                    label = label[0].toUpperCase() + label.slice(1)
                    prop.label = label;
                }
                if(prop.specType === "hole" && prop.totalType){
                    let label = prop.totalType;
                    label = label[0].toUpperCase() + label.slice(1)
                    prop.label = label;
                }
                if(prop.hole){
                    if(prop.player){
                        if(!(prop.playerNum in fields.player)){
                            fields.player[prop.playerNum] = new TotalSumField();
                        }
                        fields.player[prop.playerNum].add(item, prop.holeType);
                        item.toUpdate.push(fields.player[prop.playerNum]);
                    } else if(prop.specType in fields){
                        fields[prop.specType].add(item, prop.holeType);
                        item.toUpdate.push(fields[prop.specType]);
                    }
                } else if(prop.totalType){
                    if(prop.player){
                        if(!(prop.playerNum in fields.player)){
                            fields.player[prop.playerNum] = new TotalSumField();
                        }
                        fields.player[prop.playerNum].addTotal(item, prop.totalType);
                    } else if(prop.specType in fields){
                        fields[prop.specType].addTotal(item, prop.totalType);
                    }
                }
                if(prop.specType === "handicap"){
                    if(!prop.hole && prop.info){
                        prop.blank = true;
                    }
                }
                prop.order = order;
                if(prop.editable && !prop.playerName && prop.player){
                    prop.userCompletes = true;
                }
                return prop;
            });
            this.table.addProperty("editable", {
                setup: function(item){
                    item.interactive = true;
                }
            });
            this.table.addProperty("isScore", {
                setup: function(item){
                    item.isScore = true;
                }
            });
            this.table.addProperty("userCompletes", {
                setup: function(item){
                    item.completed = false;
                }
            });
            let data = this.data;
            let options = this.options;
            function getData(holeNumber){
                return data.golfHoles[holeNumber].teeBoxes[options.teeType].data;
            }
            this.table.addProperty("label", {
                setup: function(item){
                    item.text = item.properties.label;
                }
            });
            this.table.addProperty("initialValue", {
                setup: function(item){
                    item.text = item.properties.initialValue;
                }
            });
            this.table.addProperty("blank", {
                setup: function(item){
                    item.text = "";
                    item.apply(".blank");
                }
            });
            this.table.addProperty("playerName", {
                setup: function(item){
                    item.apply(".player-field");
                }
            });
            this.table.addProperty("data", {
                setup: function(item){
                    let holeNumber = item.properties.holeNumber;
                    let specType = item.properties.specType
                    if(specType === "hole"){
                        item.text = holeNumber;
                    } else {
                        let teeBox = getData(holeNumber);
                        if(teeBox){
                            switch(specType){
                                case "yardage":
                                    item.text = teeBox.yards;
                                    item.score = teeBox.yards;
                                break;
                                case "par":
                                    item.text = teeBox.par;
                                    item.score = teeBox.par;
                                break;
                                case "handicap":
                                    if(!item.properties.blank){
                                        item.text = teeBox.hcp;
                                    }
                                break;
                            }
                        }
                    }
                    
                    
                }
            });

            this.table.addRow("spec");
            this.table.addRow(1);
            this.table.addRow(2);
            this.table.addRow(3);
            this.table.addRow(4);
            this.table.addRow(5);
            this.table.addRow(6);
            this.table.addRow(7);
            this.table.addRow(8);
            this.table.addRow(9);
            this.table.addRow("out");
            this.table.addRow(10);
            this.table.addRow(11);
            this.table.addRow(12);
            this.table.addRow(13);
            this.table.addRow(14);
            this.table.addRow(15);
            this.table.addRow(16);
            this.table.addRow(17);
            this.table.addRow(18);
            this.table.addRow("in");
            this.table.addRow("total");

            this.table.addColumn("hole");
            this.table.addColumn("yardage");
            this.table.addColumn("par");
            this.table.addColumn("handicap");
            this.table.addColumn(1);
            this.table.addColumn(2);
            this.table.addColumn(3);
            this.table.addColumn(4);
            

            for(let field in fields){
                if(field === "player"){
                    for(let player in fields.player){
                        fields.player[player].update();
                    }
                } else {
                    fields[field].update();
                }
            }

            this.table.toFront();
        }
    }

    class GolfCourseInfoPage extends ElementI {
        constructor(data, frontElement, backElement){
            let element = app.model.golfCourseInfoPage.page.clone();
            super(element, frontElement, backElement);
            this.innerElement = new ElementI(app.model.golfCourseInfoPage.content.main.clone(), element);
            this.loadElement = new ElementI(app.model.golfCourseInfoPage.content.load.clone(), element);
            this.data = data;
            this.loadElement.toFront();
            this.innerElement.toFront();
            this.elements = getElements({
                img: "img.course-image",
                website: ".course-website",
                name: ".course-header",
                phone: ".course-phone-number",
                address: ".course-address"
            }, {
                element: element,
                modify: function(element, info){
                    if(!element){
                        console.log("Missing", info.query);
                        throw new Error("Invalid query");
                    }
                    element = new ElementI(element);
                    return element;
                }
            });
            this.innerElement.toBack();
            this.load();
        }
        async load(){
            if(this.hasLoad) return;
            let success = await this.data.fetchData();
            if(!success) return false;
            this.loadElement.remove();
            this.loadElement = null;
            this.innerElement.toFront();
            this.create();
            this.hasLoad = true;
            return true;
        }
        setPage(){
            app.menu.items.info.show();
            app.pages.add({
                courseInfo: {
                    element: this,
                    icon: app.icons.info
                }
            });
        }
        create(){
            let data = this.data.data;
            this.elements.address.text = `${data.addr1} ${data.city}, ${data.stateOrProvince} ${data.zipCode}`;
            this.elements.phone.text = data.phone;
            this.elements.name.text = data.name;
            let websiteI = this.elements.website;
            let website = websiteI.element;
            let websiteAddr = data.website || "";
            websiteI.text = websiteAddr;
            let attr = document.createAttribute("href");
            attr.value = websiteAddr;
            website.attributes.setNamedItem(attr);
            attr = document.createAttribute("target");
            attr.value = "_blank";
            website.attributes.setNamedItem(attr);
            let imgI = this.elements.img;
            let img = imgI.element;
            if(data.thumbnail){
                img.src = data.thumbnail;
                img.width = 480;
                img.height = 270;
            }
           
        }
    }

    class GolfCourseOptionsElement extends ElementI {
        constructor(element, frontElement, backElement){
            super(element, frontElement, backElement);
            element = this.element;
            let datalist = document.createElement("datalist");
            datalist.id = "golf-course-tee-types";
            this.add(datalist);
            this.elements = getElements({
                teeTypesList: "#golf-course-tee-types",
                teeTypeSelection: "#golf-course-tee-type-selection",
                startButton: "#start-page-start-button"
            }, {
                element: element,
                modify: function(element, info){
                    if(!element){
                        console.log("Missing", info.query);
                        throw new Error("Invalid query");
                    }
                    element = new ElementI(element);
                    return element;
                }
            });
            this.elements.startButton.hide();
        }
        config(course){
            this.reset();

            this.course = course;

            // change teeTypes
            for(let type of course.teeTypes){
                let option = document.createElement("option");
                option.value = type;
                this.elements.teeTypesList.add(option);
            }

        }
        reset(){
            this.elements.teeTypesList.clear();
        }
        signalAllValid(allValid){
            if(allValid){
                this.elements.startButton.show();
                this.allowStart = true;
            } else {
                this.elements.startButton.hide();
                this.allowStart = false;
            }
        }
        signalInvalid(name){
            
            let valid = true;
            switch(name){
                case "golfCourse":
                    
                break;
                case "teeType":

                break;
            }
        }
        signalMissing(name){
            // empty
        }
        get teeType(){
            let teeType = this.elements.teeTypeSelection.element.value;
            if(this.course && this.course.hasTeeType(teeType)){
                return teeType;
            }
            return null;
        }
        get hasCourse(){return !!this.course;}
    }

    class ScoreTableItem extends ElementI {
        constructor(row, element, id=["",""]){
            super(element, row);
            this.id = id;
            this.strId = `${id[0]}-${id[1]}`;
            this.row = row;
            this.properties = {};
            this.toUpdate = [];
            this.row.table.register(this);
        }
        set score(score){
            score = Number(score);
            if(!isFinite(score)){
                this._score = NaN;
                this.text = "-";
            } else {
                score = Math.round(score%1000000);
                this._score = score;
                this.text = score;
                this.completed = true;
            }
            for(let updateable of this.toUpdate){
                updateable.update();
            }
        }
        get score(){
            return this._score;
        }
        set isScore(isScore){
            this._isScore = isScore;
        }
        get isScore(){
            return this._isScore || false;
        }
        set completed(completed){
            if(completed && this.completed) return;
            if(this.interactive){
                this._completed = completed;
                this.row.table.setComplete(this, completed===false?this.properties.order:0);
            }
        }
        get completed(){
            return this._completed !== false;
        }
        handleEvent(e){
            if(this.interactive){
                let confirm = false;
                let isLong = false;
                let inputLength = 8;
                if(this.text.length >= inputLength) isLong = true;
                switch(e.type){
                    case "click":
                        this.startEdit();
                        break;
                    case "keydown":
                        // exit on regular input
                        
                        if(e.code !== "Enter") {
                            if(isLong) {
                                this.select();
                            }
                            break;
                        }
                        confirm = true;
                        e.preventDefault();
                    case "blur":
                    case "focusout":
                        let text = this.endEdit();
                        if(this.isScore){
                            this.score = text;
                        } else {
                            this.text = text;
                        }
                        if(confirm){
                            if(!this.completed) this.completed = true;
                            this.row.table.goToNext();
                        }
                        break;
                }
            }
        }
        set interactive(interactive){
            if(interactive){
                this._interactive = true;
                this.apply(".interactive");
                this.element.addEventListener("click", this);
                this.element.addEventListener("keydown", this);
                this.element.addEventListener("blur", this);
                this.element.addEventListener("focusout", this);

            } else {
                if(!this.completed){
                    this.completed = true;
                }
                this._interactive = false;
                this.apply("-.interactive");
                this.element.removeEventListener("click", this);
                this.element.removeEventListener("keydown", this);
                this.element.removeEventListener("blur", this);
                this.element.removeEventListener("focusout", this);
            }
        }
        get interactive(){
            return this._interactive;
        }
        startEdit(){
            if(this.isScore && isNaN(this.score)){
                this.text = "";
            }
            this.apply(".inedit");
            return super.startEdit();
        }
        endEdit(){
            this.apply("-.inedit");
            return super.endEdit();
        }
    }

    class ScoreTableRow extends ElementI {
        constructor(table, id){
            let element = document.createElement("tr");
            super(element, table);
            this.id = id;
            this.items = [];
            this.table = table;
        }
        *[Symbol.iterator](){
            yield* this.items;
        }
        addColumn(id){
            let item = new ScoreTableItem(this, document.createElement("td"), [this.id, id]);
            this.items.push(item);
            this.add(item);
            item.toFront();
            return item;
        }
    }

    /*class ScoreTableHead extends ScoreTableRow {
        addColumn(id){
            let item = new ScoreTableItem(this, document.createElement("th"));
            this.items.push(item);
            this.add(item);
            item.toFront();
            return item;
        }
    }*/

    class ScoreTableProperty {
        constructor(table, name, {setup, test}={}){
            this.table = table;
            this.name = name;
            //this.updateFn = update;
            this.setupFn = setup;
            this.testFn = test;
            this.items = new Set();
            //this.toUpdate = toUpdate;
        }
        *[Symbol.iterator](){
            yield* this.items;
        }
        test(item){
            return !this.testFn || this.testFn(item, this);
        }
        update(){
            if(this.updateFn){
                this.updateFn(this);
            }
        }
        setup(item){
            this.items.add(item);
            if(this.setupFn) this.setupFn(item, this);
        }
    }

    class OrderedNode {
        constructor(index, value){
            this.next = null;
            this.prev = null;
            this.index = index;
            this.value = value;
        }
        set next(next){
            this._next = next;
            if(next){
                next.prev = this;
            }
        }
        get next(){
            return this._next;
        }
        
        set prev(prev){
            this._prev = prev;
        }
        get prev(){
            return this._prev;
        }
        test(node){
            return (node.index > this.index);
        }
        insert(node){
            if(this.next && this.next.test(node)){
                return this.next.insert(node);
            } else {
                let last = this.next;
                this.next = node;
                if(last){
                    node.insert(last);
                }
            }
            return;
        }
        remove(){
            if(this.prev){
                this.prev.next = this.next;
            }
        }
        toArray(arr=[]){
            arr.push(this);
            return this.next? this.next.toArray(arr) : arr;
        }
        toString(){
            return `Node{${this.index}:${this.value}}${this.next?` ${this.next.toString()}`:``}`;
        }
    }
    class OrderedNodeHead extends OrderedNode {
        constructor(){
            super(null);
            window.node = this;
        }
        set prev(prev){}
        get prev(){return null}
        get isEmpty(){
            return !!this.next;
        }
        test(){return true;}
        create(index, value){
            let node = new OrderedNode(index, value);
            this.insert(node);
            return node;
        }
        toString(){
            return `<Head>${this.next?` ${this.next.toString()}`:``}`;
        }
        toArray(){
            return this.next? this.next.toArray([]) : [];
        }
        remove(){}
    }

    class ScoreTable extends ElementI {
        constructor(scorePage, getProps=()=>[]){
            let frontElement = scorePage.innerElement;
            let element = document.createElement("table");
            super(element, frontElement);
            this.score = scorePage;
            this.apply(".score-table");
            this.rows = [];
            this.columns = [];
            this.items = {};
            this.properties = {};
            this.propertyOrder = [];
            this.uncomplete = new Map();
            this.nextList = new OrderedNodeHead();
            this.getPropsFn = getProps;
            //this.head = new ScoreTableHead(this);
            //this.head.toFront();
        }
        *[Symbol.iterator](){
            for(let row of this.rows){
                yield* row;
            }
        }
        addColumn(id){
            this.columns.push(id);
            //this.head.create().text = id;
            for(let row of this.rows){
                row.addColumn(id);
            }
        }
        addRow(id){
            let row = new ScoreTableRow(this, id);
            this.rows.push(row);
            this.add(row);
            for(let cID of this.columns){
                row.addColumn(cID);
            }
            row.toFront();
            return row;
        }
        register(item){
            this.items[item.strId] = item;
            let props = this.getPropsFn(item);
            item.properties = props;
            for(let name of this.propertyOrder){
                if(props[name]){
                    this.properties[name].setup(item);
                }
            }
        }
        addProperty(name, options){
            this.properties[name] = new ScoreTableProperty(this, name, options);
            this.propertyOrder.push(name);
        }
        setComplete(item, index){
            if(index){
                if(!this.uncomplete.has(item)){
                    let node = this.nextList.create(index, item);
                    this.uncomplete.set(item, node);
                }
            } else if(this.uncomplete.has(item)){
                let node = this.uncomplete.get(item);
                this.uncomplete.delete(item);
                node.remove();
            }
            if(this.isComplete){
                if(toastr){
                    toastr.options = {
                        "closeButton": true,
                        "debug": false,
                        "newestOnTop": false,
                        "progressBar": false,
                        "positionClass": "toast-bottom-center",
                        "preventDuplicates": false,
                        "onclick": null,
                        "showDuration": "300",
                        "hideDuration": "1000",
                        "timeOut": "5000",
                        "extendedTimeOut": "1000",
                        "showEasing": "swing",
                        "hideEasing": "linear",
                        "showMethod": "fadeIn",
                        "hideMethod": "fadeOut"
                      };
                    toastr.success("Congratulations, you finished the game!");
                }
                if(this.onCompleted){
                    this.onCompleted(this);
                }
            }
        }
        goToNext(){
            if(this.nextList.next){
                this.nextList.next.value.startEdit();
            }
        }
        get isComplete(){
            return !this.uncomplete.size;
        }
    }

    function toggleElementWithButtonClick(elementId, buttonQuery){
        let buttons = document.querySelectorAll(buttonQuery);
        let element = document.getElementById(elementId);
        if(!element) return null;
        let elementState = false;
        function toggleElement(){
            if(elementState){
                element.classList.remove("active");
                elementState = false;
            } else {
                element.classList.add("active");
                elementState = true;
            }
        }
        for(let button of buttons){
            button.addEventListener("click", toggleElement);
        }
        return buttons.length;
    }

    function getElements(obj, options={}){
        let element=options.element||document;
        let modify = options.modify;
        let modifyQuery = options.modifyQuery;
        for(let key in obj){
            let query;
            let info = {};
            let type = typeof obj[key];
            info.type = type;
            if(type === "string"){
                query = obj[key];
            } else if(type === "object"){
                query = obj[key].target;
                if(obj[key].modify){
                    modify = modify;
                    info.defaultModify = modify;
                }
            }
            if(modifyQuery){
                info.originalQuery = query;
                query = modifyQuery(query);
            }
            info.query = query;
            let result;
            if(query[0]==="*"){
                result = element.querySelectorAll(query.slice(1));
            } else {
                result = element.querySelector(query);
            }
            if(modify){
                result = modify(result, info, options, obj[key]);
            }
            obj[key] = result;
        }
        return obj;
    }

    function createGolfCoursesDatalist(id){
        let datalist = document.createElement("datalist");
        if(id) datalist.id = id;
        for(let course of golfCourses){
            let option = document.createElement("option");
            option.value = course.baseData.name;
            option.course = course;
            datalist.appendChild(option);
        }
        return datalist;
    }

    var golfCourses;
    var golfCourseByName = new Map();

    var app = {};

    class AppPages {
        constructor(){
            this.pages = {}
            this.current = null;
        }
        add(obj){
            for(let name in obj){
                let page = obj[name];
                this.pages[name] = new AppPages.Page(page.element, page.icon);
            }
        }
        to(name){
            if(name in this.pages){
                let page = this.pages[name];
                if(page !== this.current){
                    if(this.current){
                        this.current.toBack();
                    }
                    page.toFront();
                    this.current = page;
                }
            }
        }
    }

    AppPages.Page = class AppPage {
        constructor(pageElement, iconElement){
            this.pageElement = pageElement;
            this.iconElement = new ElementI(iconElement.clone(), app.elements.topBarIconArea);
            this.iconElement.element.width = 50;
            this.iconElement.element.height = 50;
        }
        toFront(){
            this.pageElement.toFront();
            this.iconElement.toFront();
        }
        toBack(){
            this.pageElement.toBack();
            this.iconElement.toBack();
        }
    }

    function makeGolfApp(){
        let success = toggleElementWithButtonClick("menu", ".menu-button");
        if(!success){
            console.log("failed to add buttons for #menu & .menu-button(s):", success);
        }


        function modify(element, info, common, local){
            if(!element){
                console.log("Missing", info.query);
                throw new Error("Invalid query");
            }
            element.classList.remove("toload");
            if(local.remove === true || (local.remove !== false && common.remove)){
                removeElement(element);
            }
            let created = false;
            if(info.type === "object"){
                if(local.adjust){
                    element = local.adjust(element, info, common, local.options);
                    created = true;
                }
            }
            if(!created){
                element = new ElementI(element, appElement);
            }
            if(local.background === true || (local.background !== false && common.background)){
                element.toBack();
            }
            if(local.hide === true || (local.hide !== false && common.hide)){
                element.hide();
            }
            return element;
        }

        let components = getElements({
            golfScoreContent: "#golf-score-page > .content",
            loadPageContent: "#golf-score-page > .load-content",
            appIcons: "#app-icons",
            golfCourseInfoContent: "#golf-course-info-page > .content",
            golfCourseInfoLoad: "#golf-course-info-page > .load-content"
        }, {
            modify: modify,
            remove: true
        });

        let elements = getElements(
            {
                extendedOptions: {
                    target: "#start-page-extended-options", 
                    adjust: element => (new GolfCourseOptionsElement(element)),
                    hide: true
                },
                menu: "#menu",
                topBarIconArea: "#top-bar-icon-area",
                background: ".app"
            }, {
                modify: modify
            }
        );
        
        

        let pages = getElements(
            {
                start: "#start-page",
                golfScore: "#golf-score-page",
                golfCourseInfo: "#golf-course-info-page"
            }, {
                modify: modify,
                background: true
            }
        );

        let menuItems = getElements(
            {
                newGame: {
                    target: ".menu-new-game"
                },
                info: {
                    target: ".menu-course-info",
                    hide: true
                },
                currentGame: {
                    target: ".menu-current-game",
                    hide: true
                }
            },{
                element: elements.menu.element,
                modify: modify
            }
        )

        let appIcons = getElements({
            scoreTable: "[name=score-table]",
            golf: "[name=golf]",
            info: "[name=info]"
        }, {
            element: components.appIcons.element,
            modify: function(element, info){
                if(!element){
                    console.log("Missing", info.query);
                    throw new Error("Invalid query");
                }
                element = new ElementI(element);
                return element;
            }
        });

        app.elements = elements;
        app.pages = new AppPages();
        
        app.menu = {
            items: menuItems
        }
        app.icons = appIcons;

        app.pages.add({
            start: {
                element: pages.start,
                icon: app.icons.golf
            }
        })

        app.model = {
            golfCourseInfoPage: {
                content: {
                    load: components.golfCourseInfoLoad,
                    main: components.golfCourseInfoContent
                },
                page: pages.golfCourseInfo
            },
            golfScorePage: {
                content: {
                    load: components.loadPageContent,
                    main: components.golfScoreContent
                },
                page: pages.golfScore
            }
        }

        pages.start.add(createGolfCoursesDatalist("golf-course-names"));

        app.pages.to("start");
        pages.start.toFront();
        pages.golfScore.toBack();
        pages.golfScore.frontElement = null;
        
        setAppBackground("https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2");

    }

    async function init(){
        let golfCourseData = await getAvailableGolfCourses();
        golfCourses = [];
        for(let data of golfCourseData){
            data = new GolfCourseData(data);
            golfCourses.push(data);
        }
        makeGolfApp();
    }

    function createScore(){
        let oe = app.elements.extendedOptions;
        if(oe.hasCourse){
            let teeType = oe.teeType;
            if(teeType !== null){
                oe.course, teeType;
                app.pages.add({
                    score: {
                        element: new GolfScorePage(oe.course, {teeType: teeType}, appElement),
                        icon: app.icons.scoreTable
                    }
                });
                app.pages.to("score");
                app.menu.items.currentGame.show();
            }
        }
    }

    async function loadCourse(course, name){
        await course.fetchData();
        app.elements.extendedOptions.config(course);
        app.elements.extendedOptions.show();
        await course.createInfoPage();
        course.infoPage.setPage();
    }

    function selectGolfCourse(name){
        if(golfCourseByName.has(name)){
            let course = golfCourseByName.get(name);
            loadCourse(course, name);
            app.options.course = course;
            return name;
        } else {
            return name;
        }
    }

    app.options = {
        valid: {}
    };

    function validateOptions(options){
        let oe = app.elements.extendedOptions;
        for(let key in options){
            if(options[key] === "valid"){
                app.options.valid[key] = true;
            } else {
                app.options.valid[key] = false;
            }
        }
        let allValid = true;
        for(let key of ["golfCourse", "teeType"]){
            if(!app.options.valid[key]){
                allValid = false;
                break;
            }
        }

        oe.signalAllValid(allValid);

        return allValid;
    }

    function addOption(option){
        let valid = {};
        let oe = app.elements.extendedOptions;
        if("golfCourse" in option){
            if(golfCourseByName.has(option.golfCourse)){
                valid.golfCourse = "valid";
                selectGolfCourse(option.golfCourse);
            } else {
                valid.golfCourse = "invalid";
                oe.signalInvalid("golfCourse");
            }
        }
        if("teeType" in option){
            if(oe.hasCourse){
                if(oe.course.hasTeeType(option.teeType)){
                    valid.teeType = "valid";
                    app.options.teeType = option.teeType;
                } else {
                    valid.teeType = "invalid";
                    oe.signalInvalid("teeType");
                }
            } else {
                valid.golfCourse = "missing";
                oe.signalMissing("golfCourse");
            }
        }
        validateOptions(valid);
    }

    function setAppBackground(url){
        app.elements.background.element.style.backgroundSize = "cover";
        app.elements.background.element.style.backgroundPosition = "50%";
        app.elements.background.element.style.backgroundRepeat = "no-repeat";
        app.elements.background.element.style.backgroundImage = `url(${url})`;
    }

    function toggleMenu(){
        let menu = app.elements.menu;
        let active = menu.element.classList.contains("active");
        menu.apply(`${active?'-':''}.active`);
    }

    return {
        init: init,
        createScore: createScore,
        selectGolfCourse: selectGolfCourse,
        setAppBackground: setAppBackground,
        addOption: addOption,
        toggleMenu: toggleMenu,
        to: function(name){app.pages.to(name)}
    };
}
