
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
        }
        toBack(){
            this.backElement.appendChild(this.element);
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
            this.element.contentEditable = true;
            this.focus()
            this.select();
        }
        endEdit(){
            let value = this.element.innerText;
            this.element.contentEditable = false;
            return value;
        }
    }

    var golfScorePageModel;
    class GolfScorePage extends ElementI {
        constructor(data, frontElement, backElement){
            let element = golfScorePageModel.page.clone();
            super(element, frontElement, backElement);
            this.innerElement = new ElementI(golfScorePageModel.content.main.clone(), element);
            this.loadElement = new ElementI(golfScorePageModel.content.load.clone(), element);
            this.data = data;
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
            this.table = new ScoreTable(this);
            this.table.addColumn("spec");
            this.table.addColumn("1");
            this.table.addColumn("2");
            this.table.addColumn("3");
            this.table.addColumn("4");
            this.table.addColumn("5");
            this.table.addColumn("6");
            this.table.addColumn("7");
            this.table.addColumn("8");
            this.table.addColumn("9");
            this.table.addColumn("out");
            this.table.addRow("hole");
            this.table.addRow("yardage");
            this.table.addRow("par");
            this.table.addRow("handicap");
            this.table.addRow("player1");
            this.table.addRow("player2");
            this.table.addRow("player3");
            this.table.addRow("player4");
            this.table.toFront();
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
                teeTypeSelection: "#golf-course-tee-type-selection"
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
        signalInvalid(name){
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
        set allowStart(allow){

        }
    }

    class Player {
        constructor(elements){
            this.elements = elements;
        }
    }

    class ScoreTableItem extends ElementI {
        constructor(row, element, id=["",""]){
            super(element, row);
            this.id = id;
            this.row = row;
            this.element.addEventListener("click", this);
            this.interactive = true;
            this.text = `${id[0]}-${id[1]}`
        }
        set score(score){
            this._score = score || 0;
            this.text = this.score;
        }
        get score(){
            return this._score;
        }
        handleEvent(e){
            switch(e.type){
                case "click":
                    if(this.interactive){
                        this.startEdit();
                    }
                break;
            }
        }
        set interactive(interactive){
            if(interactive){
                this._interactive = true;
                this.apply(".interactive");
                this.element.addEventListener("click", this);
            } else {
                this._interactive = false;
                this.apply("-.interactive");
                this.element.removeEventListener("click", this);
            }
        }
        get interactive(){
            return this._interactive;
        }
        startEdit(){
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

    class ScoreTable extends ElementI {
        constructor(scorePage){
            let frontElement = scorePage.innerElement;
            let element = document.createElement("table");
            super(element, frontElement);
            this.score = scorePage;
            this.apply(".score-table");
            this.rows = [];
            this.columns = [];
            //this.head = new ScoreTableHead(this);
            //this.head.toFront();
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
            appIcons: "#app-icons"
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
                background: ".app",
                startButton: "#start-page-start-button"
            }, {
                modify: modify
            }
        );
        
        

        let pages = getElements(
            {
                start: "#start-page",
                golfScore: "#golf-score-page"
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
            golf: "[name=golf]"
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

        golfScorePageModel = {
            content: {
                load: components.loadPageContent,
                main: components.golfScoreContent
            },
            page: pages.golfScore
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
                        element: new GolfScorePage(oe.course, appElement),
                        icon: app.icons.scoreTable
                    }
                });
                app.pages.to("score");
                app.menu.items.currentGame.show();
            }
        }
    }

    function toScorePage(){
        app.pages.to("score");
    }
    function toStartPage(){
        app.pages.current.toBack();
        app.pages.start.toFront();
        app.pages.current = app.pages.start;
    }

    async function loadCourse(course, name){
        await course.fetchData();
        app.elements.extendedOptions.config(course);
        app.elements.extendedOptions.show();
    }

    function selectGolfCourse(name){
        if(golfCourseByName.has(name)){
            let course = golfCourseByName.get(name);
            loadCourse(course, name);
            app.options.course = course;
            app.menu.items.info.show();
            return name;
        } else {
            return "";
        }
    }

    app.options = {

    };

    function validateOptions(options){
        //let oe = app.elements.extendedOptions;
        for(let key in options){
            if(options[key] === "valid"){
                app.options.valid[key] = true;
            } else {
                app.options.valid[key] = false;
            }
        }
        let allValid = true;
        for(let key in app.options){
            if(!app.options[key]){
                allValid = false;
                break;
            }
        }
        return allValid;
    }

    function addOption(option){
        let valid = {};
        if("golfCourse" in option){
            if(golfCourseByName.has(option.golfCourse)){
                valid.golfCourse = "valid";
                selectGolfCourse(option.golfCourse);
            } else {
                valid.golfCourse = "invalid";
                oe.signalInvalid("golfCourse");
            }
        }
        let oe = app.elements.extendedOptions;
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
        if(validateOptions(valid)){
            oe.allowStart = true;
        }
    }

    function setAppBackground(url){
        app.elements.background.element.style.backgroundSize = "cover";
        document.body.style.backgroundPositionY = "50%";
        app.elements.background.element.style
        app.elements.background.element.style.backgroundRepeat = "no-repeat";
        app.elements.background.element.style.backgroundImage = `url(${url})`;
    }

    return {
        init: init,
        createScore: createScore,
        selectGolfCourse: selectGolfCourse,
        addOption: addOption,
        to: function(name){app.pages.to(name)}
    };
}
