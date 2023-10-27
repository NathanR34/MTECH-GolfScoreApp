
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
            function test(){
                return new Promise(function(resolve, reject){
                    window.setTimeout(function(){resolve()}, 8000);
                })
            }
            await test();
            if(!success) return false;
            this.loadElement.remove();
            this.loadElement = null;
            this.innerElement.toFront();
            this.hasLoad = true;
            return true;
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
                modify: function(element, info, spec){
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
        get teeType(){
            let teeType = this.elements.teeTypeSelection.element.value;
            console.log(teeType);
            if(this.course && this.course.hasTeeType(teeType)){
                return teeType;
            }
            return null;
        }
        get hasCourse(){return !!this.course;}
    }

    class AppPage {
        constructor(pageElement, iconElement){
            this.pageElement = pageElement;
            this.iconElement = iconElement;
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

    function getElements(obj, {element=document, modify, modifyQuery}={}){
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
                result = modify(result, info, obj[key]);
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

    function makeGolfApp(){
        let success = toggleElementWithButtonClick("menu", ".menu-button");
        if(!success){
            console.log("failed to add buttons for #menu & .menu-button(s):", success);
        }

        let components = getElements({
            golfScoreContent: "#golf-score-page > .content",
            loadPageContent: "#golf-score-page > .load-content"
        }, {
            modify: function(element, info){
                if(!element){
                    console.log("Missing", info.query);
                    throw new Error("Invalid query");
                }
                removeElement(element);
                element = new ElementI(element, null);
                return element;
            }
        });

        let elements = getElements(
            {
                extendedOptions: {
                    target: "#start-page-extended-options", 
                    create: (element)=>{element = new GolfCourseOptionsElement(element); element.hide(); return element;}
                }
            }, {
                modify: function(element, info, spec){
                    if(!element){
                        console.log("Missing", info.query);
                        throw new Error("Invalid query");
                    }
                    let created = false;
                    if(info.type === "object"){
                        if(spec.create){
                            element = spec.create(element, info, spec);
                            created = true;
                        }
                    }
                    if(!created){
                        element = new ElementI(element, appElement);
                    }
                    element.apply("-.toload");
                    return element;
                }
            }
        )

        let pages = getElements(
            {
                start: "#start-page",
                golfScore: "#golf-score-page"
            }, {
                modify: function(element, info, spec){
                    if(!element){
                        console.log("Missing", info.query);
                        throw new Error("Invalid query");
                    }
                    let created = false;
                    if(info.objectSpec){
                        if(spec.create){
                            element = spec.create(element, info, spec);
                            created = true;
                        }
                    }
                    if(!created){
                        element = new ElementI(element, appElement);
                    }
                    element.toBack();
                    element.apply("-.toload");
                    return element;
                }
            }
        );

        app.elements = elements;
        app.pages = {
            start: pages.start
        };

        golfScorePageModel = {
            content: {
                load: components.loadPageContent,
                main: components.golfScoreContent
            },
            page: pages.golfScore
        }
        console.log(golfScorePageModel);

        pages.start.add(createGolfCoursesDatalist("golf-course-names"));

        app.pages.current = app.pages.start;
        pages.start.toFront();
        pages.golfScore.toBack();
    }

    async function init(){
        let golfCourseData = await getAvailableGolfCourses();
        golfCourses = [];
        for(let data of golfCourseData){
            golfCourses.push(new GolfCourseData(data));
        }
        makeGolfApp();
    }

    function createScore(){
        let oe = app.elements.extendedOptions;
        if(oe.hasCourse){
            let teeType = oe.teeType;
            if(teeType !== null){
                oe.course, teeType;
                let scorePage = new GolfScorePage(oe.course, appElement);
                app.pages.scorePage = scorePage;
                toScorePage();
            } else {
                console.log("no tee type");
            }
        } else {
            console.log("no course");
        }
    }

    function toScorePage(){
        if(app.pages.scorePage){
            app.pages.current.toBack();
            app.pages.scorePage.toFront();
            app.pages.current = app.pages.scorePage;
        }
        //pages.golfScore.toFront();
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
            return name;
        } else {
            console.log("invalid", name)
            return "";
        }
    }

    return {
        init: init,
        createScore: createScore,
        selectGolfCourse: selectGolfCourse
    }
}
