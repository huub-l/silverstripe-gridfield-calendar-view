(function ($) {
    $.entwine('ss', ($) => {
        /**
         * Calendar Toggle Component
         */
        $('.ss-gridfield .calendar-view-mode-toggle').entwine({
            onadd: function () {
                this._super();

                //Restore the selected button if the rembered state is calendar
                const gridField = this.closest('.ss-gridfield');
                const state = gridField.getState().GridFieldCalendarView;
                if (state && state.view_mode == 'calendar') {
                    this.find('.calendar-view-list').parent().removeClass('active');
                    this.find('.calendar-view-month').parent().addClass('active');

                    gridField.find('.ss-gridfield-table, .grid-field__table').hide();
                    gridField.find('.ss-gridfield-calendar').show().redraw();
                } else if ((!state || !state.view_mode) && this.attr('data-default-view-mode') == 'calendar') {
                    this.find('.calendar-view-list').parent().removeClass('active');
                    this.find('.calendar-view-month').parent().addClass('active');

                    gridField.find('.ss-gridfield-table, .grid-field__table').hide();
                    gridField.find('.ss-gridfield-calendar').show().redraw();
                }
            }
        });

        /**
         * Calendar Toggle Component items
         */
        $('.ss-gridfield .calendar-view-mode-toggle li a').entwine({
            onclick: function () {
                //If already active do nothing
                if (this.parent().hasClass('active')) {
                    return false;
                }

                const gridField = this.closest('.ss-gridfield');

                //Remove all active
                this.parent().siblings('.active').removeClass('active');

                //Mark this as the active one
                this.parent().addClass('active');

                //Switch the view mode
                if (this.attr('data-view-mode') == 'calendar') {
                    gridField.find('.ss-gridfield-table, .grid-field__table').hide();
                    gridField.find('.ss-gridfield-calendar').show().redraw();
                } else {
                    gridField.find('.ss-gridfield-calendar').hide();
                    gridField.find('.ss-gridfield-table, .grid-field__table').show();
                }

                let state = gridField.getState().GridFieldCalendarView;
                if (state) {
                    state.view_mode = this.attr('data-view-mode');
                } else {
                    state = {
                        view_mode: this.attr('data-view-mode'),
                        start_date: ''
                    };
                }

                gridField.setState('GridFieldCalendarView', state);

                return false;
            }
        });

        /**
         * Calendar Component
         */
        $('.ss-gridfield .ss-gridfield-calendar').entwine({
            GridFieldID: null,
            Rendered: false,
            FullCalendar: null,

            onadd: function () {
                this._super();

                //Restore the calendar to the front if the rembered state says to
                const gridField = this.closest('.ss-gridfield');
                const state = gridField.getState().GridFieldCalendarView;
                if (state && state.view_mode == 'calendar') {
                    gridField.find('.ss-gridfield-table, .grid-field__table').hide();
                    this.show().redraw();
                }
            },

            redraw: function () {
                const self = this;

                //If already rendered bail
                if (this.getRendered()) {
                    const fullCalendar = this.getFullCalendar();
                    fullCalendar.updateSize();
                    fullCalendar.render();

                    return;
                }

                const gridField = this.closest('.ss-gridfield');
                const state = gridField.getState().GridFieldCalendarView;

                this.setGridFieldID(gridField.attr('id'));

                /**** Bootstrap Calendar ****/
                const calendar = self.find('.calendar-display');
                const stateField = gridField.find('.gridstate');
                let monthHop = false;

                //Reload the start date from the grid state
                let startDate = null;
                if (state && state.start_date!='') {
                    startDate = state.start_date;
                }

                const calendar_options = {
                    dayMaxEventRows: true,
                    initialDate: startDate,
                    events: {
                        url: self.attr('data-calendar-feed'),
                        method: 'POST',
                        startParam: 'start-date',
                        endParam: 'end-date',
                        extraParams: () => {
                            const dataObj = {
                                SecurityID: self.closest('form').find('input[name=SecurityID]').val(),
                            };
                            dataObj[stateField.attr('name')] = stateField.val();

                            return dataObj;
                        },
                        failure: () => {
                            jQuery.noticeAdd({
                                text: 'Error loading calendar, please try again later',
                                type: 'error',
                                stayTime: 5000,
                                inEffect: {left: '0', opacity: 'show'}
                            });
                        },
                        className: 'cms-panel-link',
                    },
                    buttonIcons: {
                        prev: ' font-icon-left-open-big',
                        next: ' font-icon-right-open-big',
                    },

                    /**
                     * Handles when the view is rendered
                     * @param {object} view Calendar View Object
                     */
                    viewDidMount: (view) => {
                        if (monthHop) {
                            const state = gridField.getState().GridFieldCalendarView;
                            if (state) {
                                //Store start date in the state
                                if (view.start.format('D') == 1) {
                                    state.start_date = view.start.format('YYYY-MM-01');
                                } else {
                                    state.start_date = view.start.clone().add(1, 'months').format('YYYY-MM-01');
                                }

                                gridField.setState('GridFieldCalendarView', state);
                            }
                            monthHop = false;
                        }
                    },

                    /**
                     * Handles when the view is destroyed
                     */
                    viewWillUnmount: () => {
                        //Remove all calendar tips
                        $('.gridfield-calendar-tip').remove();
                        monthHop = true;
                    },

                    /**
                     * Handles when the the loading state for the calendar changes
                     * @param {boolean} isLoading Whether or not the event calendar is loading or not
                     */
                    loading: (isLoading) => {
                        self.closest('form').toggleClass('loading', isLoading);
                    },

                    /**
                     * Adds classes to the calendar event
                     * @param {object} details Calendar Event Details Object
                     * @returns {string[]}
                     */
                    eventClassNames: (details) => {
                        if (details.event.extendedProps.className) {
                            return [details.event.extendedProps.className];
                        }

                        return [];
                    },

                    /**
                     * Shows/Creates a tooltip when the mouse is over an event item
                     * @param {object} details Calendar Event Details Object
                     */
                    eventMouseEnter: (details) => {
                        let tip = $('#' + self.getGridFieldID() + '_calendar_tt' + details.event.id);
                        if (tip.length == 0) {
                            tip = $('<div class="gridfield-calendar-tip"></div>');
                            tip.attr('id', self.getGridFieldID() + '_calendar_tt' + details.event.id);

                            if (details.event.extendedProps.className) {
                                tip.addClass(details.event.extendedProps.className.join(' '));
                            }

                            tip.append($('<p class="evt-title"/>').text(details.event.title));

                            //Figure out the event range format
                            let dateTimeStr = false;
                            const startDate = FullCalendar.Moment.toMoment(details.event.start, this.getFullCalendar());
                            if (details.event.end) {
                                const endDate = FullCalendar.Moment.toMoment(details.event.end, this.getFullCalendar());
                                const startMonth = startDate.format('MMM D');
                                const startTime = startDate.format('h:mma');
                                const endMonth = endDate.format('MMM D');
                                const endTime = endDate.format('h:mma');

                                if (startMonth == endMonth) {
                                    dateTimeStr = startMonth;

                                    if (details.event.allDay == false) {
                                        dateTimeStr += ' @ ' + startTime + ' - ' + endTime;
                                    }
                                } else {
                                    dateTimeStr = startMonth + ' - ' + endMonth;

                                    if (details.event.allDay == false) {
                                        if (startTime == endTime) {
                                            dateTimeStr += ' @ ' + startTime;
                                        } else {
                                            dateTimeStr += ' @ ' + startTime + ' - ' + endTime;
                                        }
                                    }
                                }
                            } else {
                                dateTimeStr = startDate.format('MMM D' + (!details.event.allDay ? ' @ h:mma' : ''));
                            }

                            if (dateTimeStr) {
                                tip.append($('<p class="evt-time-range"/>').text(dateTimeStr));
                            }

                            if (details.event.extendedProps.abstractText) {
                                tip.append('<hr />');
                                tip.append($('<p class="evt-abstract"/>').text(details.event.extendedProps.abstractText));
                            }

                            //Append to the dom
                            self.append(tip);
                        }

                        const calendarOffset = calendar.offset();
                        const element = $(details.el);
                        const elementPos = element.offset();
                        tip
                            .css('left', ((elementPos.left - calendarOffset.left) + (element.outerWidth() / 2)) + 'px')
                            .css('top', ((elementPos.top - calendarOffset.top) + element.outerHeight()) + 'px')
                            .show();
                    },

                    /**
                     * Hides the tooltip when the mouse leaves an event item
                     * @param {object} details Calendar Event Details Object
                     */
                    eventMouseLeave: (details) => {
                        const tip = $('#' + self.getGridFieldID() + '_calendar_tt' + details.event.id);
                        if (tip.length > 0) {
                            tip.hide();
                        }
                    },
                    views: {
                        dayGridMonth: {
                            dayMaxEventRows: 4,
                        },
                    },
                };

                // Merge calendar defaults with custom options (if available)
                if (typeof gridfield_calendar_data !== 'undefined') {
                    for (let key in gridfield_calendar_data) {
                        calendar_options[key] = gridfield_calendar_data[key];
                    }
                }

                const fullCalendar = new FullCalendar.Calendar(calendar[0], calendar_options);
                fullCalendar.render();

                this.setFullCalendar(fullCalendar);

                this.setRendered(true);
            }
        });

        $('.ss-gridfield .ss-gridfield-calendar .fc-prev-button, .ss-gridfield .ss-gridfield-calendar .fc-next-button').entwine({
            onmatch: function () {
                this._super();

                this.addClass('btn')
                    .addClass('btn-outline-secondary')
                    .removeClass('fc-button')
                    .removeClass('fc-state-default')
                    .removeClass('fc-corner-right');
            }
        });
    });
})(jQuery);
