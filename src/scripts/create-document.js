/**
 * Create Document module
 * @external {jQuery} $ H5P.jQuery
 */
H5P.DocumentExportPageJGU.CreateDocument = (function ($, EventDispatcher) {
  /**
   * Initialize module.
   * @param {Array} inputFields Array of input strings that should be exported
   * @returns {Object} CreateDocument CreateDocument instance
   */
  function CreateDocument(params, title, submitEnabled, inputFields, inputGoals) {
    EventDispatcher.call(this);

    this.inputFields = inputFields;
    this.inputGoals = inputGoals;

    this.params = params;
    this.params.l10n = this.params.l10n || {};
    this.params.l10n.averageScore =
      this.params.l10n.averageScore ?? 'Average score: @score';

    this.title = title;
    this.submitEnabled = submitEnabled;

    this.hasAssessedGoals = this.inputGoals.inputArray.some(function (inputGoalPage) {
      return inputGoalPage.some(function (inputGoal) {
        return inputGoal.goalAnswer() !== -1;
      });
    });

    this.exportableGoalsList = this.createExportableGoalsList();
  }

  // Setting up inheritance
  CreateDocument.prototype = Object.create(EventDispatcher.prototype);
  CreateDocument.prototype.constructor = CreateDocument;

  /**
   * Attach function called by H5P framework to insert H5P content into page.
   *
   * @param {jQuery} $container The container which will be appended to.
   */
  CreateDocument.prototype.attach = function ($container) {
    var self = this;

    var exportString = this.getExportString();
    exportString += this.createGoalsOutput() || '';
    var exportObject = this.getExportObject();
    var exportPage = new H5P.DocumentExportPageJGU.ExportPage(this.title,
      exportString,
      this.submitEnabled,
      this.params.submitTextLabel,
      this.params.submitSuccessTextLabel,
      this.params.selectAllTextLabel,
      this.params.exportTextLabel,
      exportObject
    );
    exportPage.getElement().prependTo($container);
    exportPage.focus();

    exportPage.on('closed', function () {
      self.trigger('export-page-closed');
    });

    exportPage.on('submitted', function (event) {
      self.trigger('submitted', event.data);
    });
  };

  /**
   * Create a generic structure holding the goals list, which is used when
   * generating both the HTML and the docx file
   *
   * @returns {Array}
   */
  CreateDocument.prototype.createExportableGoalsList = function () {
    if (this.inputGoals === undefined || !this.inputGoals.inputArray || this.inputGoals.inputArray.length === 0) {
      return;
    }

    const goals = [];
    this.inputGoals.inputArray.flat().forEach((goalInstance) => {
      const text = (goalInstance.goalAnswer() === -1) ?
        goalInstance.goalText() :
        `${goalInstance.goalText()} (${goalInstance.getTextualAnswer()})`;

      goals.push({
        text: text,
        comment: goalInstance.getComment()
      });
    });

    return [{
      label: '',
      goalArray: goals,
      goalAnswer: -1
    }];
  };

  /**
   * Generate export object that will be applied to the export template
   * @returns {Object} exportObject Exportable content for filling template
   */
  CreateDocument.prototype.getExportObject = function () {
    var flatInputsList = [];
    this.inputFields.forEach(function (inputFieldPage) {
      if (inputFieldPage.inputArray && inputFieldPage.inputArray.length) {
        var standardPage = {title: '', inputArray: []};
        if (inputFieldPage.title) {
          standardPage.title = inputFieldPage.title;
        }
        inputFieldPage.inputArray.forEach(function (inputField) {
          standardPage.inputArray.push({description: inputField.description, value: inputField.value});
        });
        flatInputsList.push(standardPage);
      }
    });

    var exportObject = {
      title: this.title,
      goalsTitle: this.inputGoals.title,
      flatInputList: flatInputsList,
      sortedGoalsList: this.exportableGoalsList,
      averageScoreText: this.averageScoreText
    };

    return exportObject;
  };

  /**
   * Generate complete html string for export
   * @returns {string} exportString Html string for export
   */
  CreateDocument.prototype.getExportString = function () {
    var self = this;
    var exportString = self.getInputBlocksString();

    return exportString;
  };

  /**
   * Generates html string for input fields
   * @returns {string} inputBlocksString Html string from input fields
   */
  CreateDocument.prototype.getInputBlocksString = function () {
    const inputBlocksString = $('<div>', {
      class: 'textfields-output'
    });

    this.inputFields.forEach(function (inputPage) {
      if (inputPage.inputArray && inputPage.inputArray.length) {
        if (inputPage.title.length) {
          inputBlocksString.append($('<h2>', {
            html: inputPage.title
          }));
        }

        inputPage.inputArray.forEach(function (inputInstance) {
          if (inputInstance) {
            const inputParagraph = $('<p>', {
              appendTo: inputBlocksString
            });

            if (inputInstance.description) {
              inputParagraph.append($('<strong>', {
                html: inputInstance.description
              }));
            }

            inputBlocksString.append($('<span>', {
              // Using text, since this comes from end-user input
              text: inputInstance.value
            }));
          }
        });
      }
    });

    return inputBlocksString.html();
  };

  /**
   * Generates html string for all goals
   * @returns {string} goalsOutputString Html string from all goals
   */
  CreateDocument.prototype.createGoalsOutput = function () {
    if (this.exportableGoalsList === undefined || this.exportableGoalsList.length === 0) {
      return '';
    }

    const output = $('<div>', {
      class: 'goals-output'
    });

    if (this.inputGoals.title !== undefined && this.inputGoals.title.length) {
      output.append($('<h2>', {
        html: this.inputGoals.title
      }));
    }

    this.exportableGoalsList.forEach(function (page) {
      if (page.label !== undefined && page.label.length) {
        output.append(
          $('<p>', {
            class: 'category',
            html: '<strong>' + page.label + ':</strong>'
          })
        );
      }
      const list = $('<ul>', {
        appendTo: output
      });
      page.goalArray.forEach(function (goal) {
        const listItem = document.createElement('li');
        const text = document.createElement('div');
        text.innerText = goal.text;
        listItem.appendChild(text);

        if (goal.comment?.length) {
          const comment = document.createElement('div');
          comment.classList.add('comment');
          comment.innerText = goal.comment;
          listItem.appendChild(comment);
        }

        list.append(listItem);
      });
    });

    if (this.hasAssessedGoals) {
      const goalInstances = this.inputGoals.inputArray.flat();

      const score = H5P.DocumentExportPageJGU.computeAverageScore(goalInstances);

      this.averageScoreText =
        this.params.l10n.averageScore.replace('@score', score.toFixed(2));

      output.append($('<p>', {
        class: 'average-score',
        html: `${this.averageScoreText}`
      }));
    }

    return output.html();
  };

  return CreateDocument;
}(H5P.jQuery, H5P.EventDispatcher));
