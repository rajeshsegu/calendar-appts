var FBCalendar = (function(/*Accept params if needed */){

    /* @ Private methods @ */


    //Helper method to check if given array has valid data
    function isValidArray(array){
        return _.isArray(array) && array.length > 0;
    };

    //Find if given two appt's are overlapping
    function isOverlapping(srcAppt, tgtAppt){
        return (srcAppt.id != tgtAppt.id)       //Not same appt
            && ( srcAppt.start < tgtAppt.end )  //Check boundries
            && ( srcAppt.end > tgtAppt.start ); //Check boundries
    };

    //Adjust right appts
    function adjustRight(appt, overlapHash){

        _.each(overlapHash, function(overlapAppt){

            if(appt.col < overlapAppt.col){
                appt.right = appt.right || [];
                appt.right.push(overlapAppt);
            }else{
                overlapAppt.right = overlapAppt.right || [];
                overlapAppt.right.push(appt);
            }

        }, this);

    };

    //Compute max column for a given appt.
    function computeMaxCol(appt, max){
        if(appt.maxdone){
            return appt.maxcol;
        }

        max = max || -1;
        appt.maxcol = _.max([appt.col, appt.maxcol, max]);
        if(appt.right){
            //Recursive alogo. to go find the maxCol in all my right nodes
            _.each(appt.right, function(a){
                appt.maxcol = _.max([appt.col, appt.maxcol, computeMaxCol(a, appt.maxcol)]);
            }, this)
        }
        //set breaker to not lead to infinite recursion
        appt.maxdone = true;
        return appt.maxcol;
    };

    //Calculated width of an appt
    function computeWidth(appt, totalWidth){
        var rightLen = ( appt.right && appt.right.length ) || 0,
            colWidth = totalWidth / (appt.maxcol+1),
            i = appt.col+1, cols=1;

        //Expand and fill the missing cols
        if(appt.col + rightLen < appt.maxcol){
            for(; i<=appt.maxcol; i++){
                var match = _.find(appt.right, function(ra){
                    return (ra.col == i);
                });
                if(match){
                    break;
                }
                cols++;
            }
            return cols*colWidth;
        }else{
            return colWidth;

        }
    };

    //Compute position of an appt
    function computePosition(appt, totalWidth){
        var width = computeWidth(appt, totalWidth);
        appt.pos = {
            top: appt.start,
            left: ( appt.col*width ),
            width: width,
            height: ( appt.end - appt.start )
        };
    };



    /* @ Public methods @ */

    return {


        //Public Attributes

        HEIGHT: 720,
        WIDTH:  600,

        //Pass jQuery selector
        calContainer: ".calendar-appt-container",
        timeSlotContainer: ".time-container",

        //appt template ( underscore style )
        APPT_TEMPLATE: [
            "<div class='appt bgWhite' id='<%= apptId %>'>",
                "<div class='apptContainer'>",
                    "<span class='apptName block'>Sample Appointment ( <%= name %> )</span>",
                    "<span class='apptLoc block'>Sample Location</span>",
                "</div>",
            "</div>"
        ].join(""),

        //time slot template ( underscore style )
        TIMESLOT_TEMPLATE: [
            "<div class='timeSlot <%= className %>'>",
                "<span class='timeSlotString'>",
                    "<%= timeStr %>",
                "</span>",
            "</div>"
        ].join(""),

        /* @

         PUZZLE 2: RENDER UI
         + show(appts)
         + cleanup()
         + render(layouts)
         + setupUI()

         @ */

        //Display's the given set of appts.
        showJSON: function(jsonStr){
            try{
                this.show(JSON.parse(jsonStr));
            }catch(error){
                alert("Supply sample data that is accepted by JSON.parse() [strict json]")
            }
        },

        //Display's the given set of appts.
        show: function(appts){
            this.setupUI();
            var layouts = this.layOutDay(appts);
            return this.render(layouts);
        },

        //cleanup UI
        cleanup: function(){
            $(this.calContainer).html('');
        },

        //Setup UI
        setupUI: function(){

            //Get it to clean state
            this.cleanup();

            //construct time slots
            this.addTimeSlots();

        },

        //Generate time slots ( do it only once )
        addTimeSlots : function(){

            //Make sure its called only once
            if(arguments.callee.added){
                return;
            }

            var noOfSlots = this.HEIGHT/30,
                timeSlotContainer = $(this.timeSlotContainer),
                i=0, slotHtml, isEven,
                date = new Date();

            //Set Date to 9AM
            date.setHours(9, 0, 0);

            for( ;i<=noOfSlots; i++){
                isEven = ( i%2 == 0 );
               slotHtml = _.template(this.TIMESLOT_TEMPLATE, {
                   timeStr: date.toSimpleTimeString(isEven),
                   className: ( isEven ? "even" : "odd" )
               });
               $(slotHtml).appendTo(timeSlotContainer);
               date.setMinutes(date.getMinutes() + 30);
            }

            arguments.callee.added = true;
        },

        //Render the given layouts and
        render: function(layouts){

            if(!isValidArray(layouts)){
                return false;
            }

            var calContainer = $(this.calContainer);

            _.each(layouts, function(apptLayout){

                if(!apptLayout.pos) return false;
                var appId = "appt-" + apptLayout.id,
                    apptHtml = _.template(this.APPT_TEMPLATE, {
                        name: apptLayout.id,
                        apptId: appId
                    }),
                    pos = apptLayout.pos;

                $(apptHtml).appendTo(calContainer);

                //Access Share info;
                $('#'+appId).css({
                    position: "absolute",
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                    height: pos.height
                });

            }, this)
        },


        /* @

            PUZZLE 1: Compute apptments layout
             + layOutDay(appts)
             + process(appts)

        @ */

        //Compute details needed to layout appointments
        layOutDay:  function(appts){

            var pAppts = this.process(appts),
                layout = [];

            if(!isValidArray(pAppts)){
                return false;
            }

            //Compute position for each appt.
            _.each(pAppts, function(appt){
                computePosition(appt, this.WIDTH);
            }, this);

            return pAppts;

        },

        //Process appointments to read overlap and find col.
        process: function(appts){

            //Valid Data ?
            if(!isValidArray(appts)) {
                return false;
            }

            //Run each appt.
            _.each(appts, function(appt, index, appts){
                var overlap = false, overlapHash = [], overlapCol = [],
                    i=0, tmpAppt;

                appt.col = 0;
                appt.maxcol = 0;

                for(; i<index; i++ ){
                    tmpAppt = appts[i];
                    if(isOverlapping(appt, tmpAppt)){
                        //update overlap flag
                        overlap = true;

                        //overlapping appts
                        overlapHash.push(tmpAppt);

                        //Calculate the correct position
                        overlapCol[tmpAppt.col] = true;
                        while(overlapCol[appt.col]){
                            appt.col++;
                        }
                    }
                }

                //figure out who is on your right
                if(overlap) {
                    adjustRight(appt, overlapHash);
                }

            }, this);

            //Once processed, Compute maxcol for each appt.
            _.each(appts, function(a){
                computeMaxCol(a);
            }, this);

            //Porcessed appts
            return appts;
        }

    };
})(/*Pass params if needed */);


//Implement toSimpleTimeString() on Date object
Date.prototype.toSimpleTimeString =
    function(ampm){
        var hours = this.getHours(),
            mins  = this.getMinutes(),
            isPM  = false;
        if(hours > 12 ){
            isPM = true;
            hours = hours-12;
        }
        if(mins == 0) {
            mins = "00";
        }
        return [
            hours,":", mins, " ",
            ampm ? (isPM ? "PM" : "AM") : ""
        ].join('');
    };

//FIXTURE Data

FBCalendar.FIXTURES = [
    {id:'A', start:0, end:100 },
    {id:'B', start:50, end:150 },
    {id:'C', start:110, end:150},
    {id:'D', start:200, end:300 }
];

FBCalendar.FIXTURES1 = [
    {id:1, start:10, end:40 },
    {id:2, start:30, end:60 },
    {id:3, start:40, end:100},
    {id:4, start:50, end:80 }
];

FBCalendar.FIXTURES2 = [
    {id: 'a', start: 30, end: 150},
    {id: 'b', start: 540, end:600},
    {id: 'c', start: 560, end: 620},
    {id: 'd', start: 610, end: 670}
];

FBCalendar.FIXTURES3 = [
    {
        "id": "A",
        "start": 30,
        "end": 120
    },
    {
        "id": "B",
        "start": 80,
        "end": 180
    },
    {
        "id": "C",
        "start": 100,
        "end": 300
    },
    {
        "id": "D",
        "start": 150,
        "end": 240
    },
    {
        "id": "E",
        "start": 200,
        "end": 280
    },
    {
        "id": "F",
        "start": 260,
        "end": 400
    },
    {
        "id": "G",
        "start": 500,
        "end": 600
    }
];

//Kick-start FB Calendar Layout
(function(window){
    if(window.FBCalendar){

        //Input
        var jsonInputEl = $('#input-data-textarea'),
            generateCalBtn = $('#generate-calendar'),
            fixtureDataDiv = $('.fixture-data');

        function populateFixture(jsonData){
            jsonData = JSON.stringify(jsonData, null, 4);
            jsonInputEl.val(jsonData);
            FBCalendar.showJSON(jsonData);
        };

        //Generate Calendar
        generateCalBtn.click(function(evt){
             var jsonData = jsonInputEl.val();
             FBCalendar.showJSON(jsonData);
        });

        //Sample FIXTURE data
        fixtureDataDiv.click(function(evt){
            var fixtureDiv = evt.target;
            var jsonData = fixtureDiv && FBCalendar[fixtureDiv.id];
            populateFixture(jsonData);
        });

        //Populate default fixture data
        populateFixture(FBCalendar.FIXTURES2);

    }
})(window);







