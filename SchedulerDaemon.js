/*\
title: $:/plugins/OokTech/TimerActions/TimerActionsDaemon.js
type: application/javascript
module-type: startup

This is the daemon process that runs a timer and periodically checks to see if
there is a new task to run based on the ellapsed time.

\*/
(function () {

  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  // Export name and synchronous status
  exports.name = "scheduler-daemon";
  exports.platforms = ["browser"];
  exports.after = ["render"];
  exports.synchronous = true;

  exports.startup = function() {
    var timerID, intervalDelay;
    function checkStatus() {
      var tasksData = {};
      var tasksText = $tw.wiki.getTiddlerText('$:/plugins/OokTech/TimerActions/TaskList', '{}');
      try {
        var tasksData = JSON.parse(tasksText);
      } catch (e) {
        console.log("Can't parse tasks data.")
      }
      // Check if the interval delay has changed
      var newDelay = $tw.wiki.getTiddlerText('$:/plugins/OokTech/TimerActions/IntervalDelay', 1000);
      if (Number(newDelay) !== Number(intervalDelay)) {
        intervalDelay = newDelay;
        clearInterval(timerID);
        setInterval(checkStatus, intervalDelay);
      }
      // See if any events are scheduled for this interval
      var list = getScheduledTasks();
      list.forEach(function(title) {
        var tiddler = $tw.wiki.getTiddler(title);
        if (tiddler) {
          // Execute actions
          $tw.rootWidget.invokeActionString(tiddler.fields.text,$tw.rootWidget);
          // update the task states
          switch (tiddler.fields.timer_type) {
            case "periodic":
              // Update the start time to the current time
              tasksData[title] = Date.now();
              break;
            case "countdown":
              // Set the task as done
              tasksData[title] = 'false';
              break;
          }
        }
      });
      if (JSON.stringify(tasksData, null, 2) !== tasksText) {
        var fields = $tw.wiki.getTiddler('$:/plugins/OokTech/TimerActions/TaskList').fields;
        $tw.wiki.addTiddler(new $tw.Tiddler(fields, {text: JSON.stringify(tasksData, null, 2)}))
      }
    }
    function getScheduledTasks() {
      var tasks = [];
      var tasksText = $tw.wiki.getTiddlerText('$:/plugins/OokTech/TimerActions/TaskList', '{}');
      try {
        // All listed tasks
        var tasksData = JSON.parse(tasksText);
        // All enabled tasks
        var enabledTasks = Object.keys(tasksData).filter(function(task) {
          return tasksData[task] !== 'false';
        });
        // Tasks that should be run now
        tasks = enabledTasks.filter(function(task) {
          var taskTiddler = $tw.wiki.getTiddler(task);
          if (taskTiddler) {
            // get schedule type
            if (taskTiddler.fields.timer_type) {
              switch(taskTiddler.fields.timer_type) {
                case "periodic":
                  //intentional fall through
                case "countdown":
                  if (tasksData[task] !== 'false') {
                    if (!Number.isNaN(Number.parseFloat(tasksData[task])) && Number.isFinite(tasksData[task])) {
                      if (Date.now() - Number(tasksData[task]) > Number(taskTiddler.fields.period)) {
                        return true;
                      } else {
                        return false;
                      }
                    } else {
                      // If it isn't false and not a number than set the value
                      // to the current time.
                      // This is how you start something.
                      tasksData[task] = Date.now();
                      return false;
                    }
                  }
                  break;
                case "scheduled":
                  // TODO this!!
                  return false;
                  break;
                default:
                  return false;
              }
            }
          } else {
            return false;
          }
        })
        if (JSON.stringify(tasksData, null, 2) !== tasksText) {
          var fields = $tw.wiki.getTiddler('$:/plugins/OokTech/TimerActions/TaskList').fields;
          $tw.wiki.addTiddler(new $tw.Tiddler(fields, {text: JSON.stringify(tasksData, null, 2)}))
        }
      } catch (e) {
        console.log('Error parsing tasks!');
        console.log(e);
      }
      return tasks;
    }
    intervalDelay = Number($tw.wiki.getTiddlerText('$:/plugins/OokTech/TimerActions/IntervalDelay')) || 1000;
    if (intervalDelay) {
      timerID = setInterval(checkStatus, intervalDelay);
    }
  }

})();
