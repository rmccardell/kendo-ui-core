(function() {
   var recurrence = kendo.recurrence,
        numberOfWeeks = recurrence.numberOfWeeks,
        weekInMonth = recurrence.weekInMonth,
        weekInYear = recurrence.weekInYear,
        dayInYear = recurrence.dayInYear,
        isException = recurrence.isException;

    module("Recurring helper methods");

    test("Numbers of weeks in 01/05/2013", function() {
        equal(recurrence.numberOfWeeks(new Date(2013, 4, 1), 0), 5);
    });

    test("Numbers of weeks in 22/06/2013", function() {
        equal(recurrence.numberOfWeeks(new Date(2013, 5, 22), 0), 6);
    });

    test("weekInMonth method returns number of the week (first week)", function() {
        var date = new Date(2013, 5, 1);
        equal(weekInMonth(date, 0), 1);
    });

    test("weekInMonth method returns number of the week (second week)", function() {
        var date = new Date(2013, 5, 2);
        equal(weekInMonth(date, 0), 2);
    });

    test("weekInMonth method returns number of the week (third week)", function() {
        var date = new Date(2013, 5, 16);
        equal(weekInMonth(date, 0), 4);
    });

    test("weekInMonth method honours weekStart (MO) - week 1", function() {
        var date = new Date(2013, 6, 7);
        equal(weekInMonth(date, 1), 1);
    });

    test("weekInMonth method honours weekStart (MO)", function() {
        var date = new Date(2013, 5, 16);
        equal(weekInMonth(date, 1), 3);
    });

    test("weekInMonth method honours weekStart (FR) - week 3", function() {
        var date = new Date(2013, 3, 18);
        equal(weekInMonth(date, 5), 3);
    });

    test("weekInMonth method honours weekStart (FR) - week 4", function() {
        var date = new Date(2013, 3, 19);
        equal(weekInMonth(date, 5), 4);
    });

    test("weekInMonth method weekStart=SA", function() {
        var date = new Date(2013, 6, 8);
        equal(weekInMonth(date, 6), 2);
    });

    test("weekInMonth method weekStart (MO) - last week", function() {
        var date = new Date(2014, 2, 31);
        equal(weekInMonth(date, 1), 6);
    });

    module("Week in year (ISO8601)");

    test("weekInYear returns 53 for (31-12-2012 00:00:00)", function(){
       var date = new Date(2012, 11, 31);
       equal(weekInYear(date), 53);
    });

    test("weekInYear returns 0 for (1-1-2012 00:00:00), because belongs to last week of previous year", function(){
       var date = new Date(2012, 0, 1);
       equal(weekInYear(date), 0);
    });

    test("weekInYear returns 0 for (1-1-2012 23:59:59), because belongs to last week of previous year", function(){
       var date = new Date(2012, 0, 1, 23, 59, 59);
       equal(weekInYear(date), 0);
    });

    test("weekInYear returns 1 for (2-1-2012 00:00:00)", function(){
       var date = new Date(2012, 0, 2);
       equal(weekInYear(date), 1);
    });

    test("weekInYear returns 3 for (18-1-2012 00:00:00)", function() {
       var date = new Date(2012, 0, 18);
       equal(weekInYear(date), 3);
    });

    test("weekInYear returns 4 for (29-1-2012 23:59:59)", function() {
       var date = new Date(2012, 0, 29, 23, 59, 59);
       equal(weekInYear(date), 4);
    });

    test("weekInYear returns 5 for (31-1-2012 23:59:59)", function() {
       var date = new Date(2012, 0, 31, 23, 59, 59);
       equal(weekInYear(date), 5);
    });

    test("weekInYear returns 7 for (15-2-2012 00:00:00)", function() {
       var date = new Date(2012, 1, 15);
       equal(weekInYear(date), 7);
    });

    test("weekInYear returns 9 for (29-2-2012 23:59:59)", function() {
       var date = new Date(2012, 1, 29, 23, 59, 59);
       equal(weekInYear(date), 9);
    });

    test("weekInYear returns 10 for (5-3-2012 00:00:00)", function() {
       var date = new Date(2012, 2, 5);
       equal(weekInYear(date), 10);
    });

    test("weekInYear returns 10 for (4-3-2013 00:00:00)", function() {
       var date = new Date(2013, 2, 4);
       equal(weekInYear(date), 10);
    });

    test("weekInYear returns 13 for (29-3-2012 00:00:00)", function() {
       var date = new Date(2012, 2, 29);
       equal(weekInYear(date), 13);
    });

    test("weekInYear returns 52 for (30-12-2012 00:00:00)", function() {
       var date = new Date(2012, 11, 30);
       equal(weekInYear(date), 52);
    });

    test("weekInYear returns 52 for (31-12-2012 00:00:00)", function() {
       var date = new Date(2012, 11, 31);
       equal(weekInYear(date), 53);
    });

    test("weekInYear returns 52 for (06-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 6);
       equal(weekInYear(date), 1);
    });

    test("weekInYear returns 1 for (07-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 7);
       equal(weekInYear(date), 2);
    });

    module("Week in year (week start -> SU)");

    test("weekInYear returns 1 for (05-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 5), weekStart = 0;
       equal(weekInYear(date, weekStart), 1);
    });

    test("weekInYear returns 2 for (06-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 6), weekStart = 0;
       equal(weekInYear(date, weekStart), 2);
    });

    test("weekInYear returns 2 for (11-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 11), weekStart = 0;
       equal(weekInYear(date, weekStart), 2);
    });

    test("weekInYear returns 3 for (13-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 13), weekStart = 0;
       equal(weekInYear(date, weekStart), 3);
    });

    module("Week in year (week start -> SA)");

    test("weekInYear returns 1 for (04-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 4), weekStart = 6;
       equal(weekInYear(date, weekStart), 1);
    });

    test("weekInYear returns 2 for (05-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 5), weekStart = 6;
       equal(weekInYear(date, weekStart), 2);
    });

    test("weekInYear returns 2 for (11-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 11), weekStart = 6;
       equal(weekInYear(date, weekStart), 2);
    });

    test("weekInYear returns  for (12-01-2013 00:00:00)", function() {
       var date = new Date(2013, 0, 12), weekStart = 6;
       equal(weekInYear(date, weekStart), 3);
    });

    module("Day in year");

    test("dayInYear return 1 for (01-01-2013)", function() {
       var date = new Date(2013, 0, 1);
       equal(dayInYear(date), 1);
    });

    test("dayInYear return 15 for (15-01-2013)", function() {
       var date = new Date(2013, 0, 15);
       equal(dayInYear(date), 15);
    });

    test("dayInYear return 46 for (15-02-2013)", function() {
       var date = new Date(2013, 1, 15);
       equal(dayInYear(date), 46);
    });

    test("dayInYear return 74 for (15-03-2013)", function() {
       var date = new Date(2013, 2, 15);
       equal(dayInYear(date), 74);
    });

    test("dayInYear return 75 for (15-03-2012) Leap Year", function() {
       var date = new Date(2012, 2, 15);
       equal(dayInYear(date), 75);
    });

    test("dayInYear return 143 for (23-05-2013)", function() {
       var date = new Date(2013, 4, 23);
       equal(dayInYear(date), 143);
    });

    test("dayInYear return 365 for (31-12-2013)", function() {
       var date = new Date(2013, 11, 31);
       equal(dayInYear(date), 365);
    });

    test("dayInYear return 366 for (31-12-2012) Leap Year", function() {
       var date = new Date(2012, 11, 31);
       equal(dayInYear(date), 366);
    });

    module("Exception dates");

    test("isException method finds date in string", function() {
        var date = new Date(2012, 11, 31),
            exception = kendo.toString(kendo.timezone.apply(date, 0), "yyyyMMddTHHmmssZ") + ";";

        ok(isException(exception, date));
    });

    test("isException method honours UTC timezone", function() {
        var date = new Date(2012, 11, 31),
            exception = kendo.toString(date, "yyyyMMddTHHmmssZ") + ";";

        ok(isException(exception, date, "Etc/UTC"));
    });

    test("isException method honours America/New_York timezone", function() {
        var date = new Date(2012, 11, 31),
            exception = kendo.toString(kendo.timezone.convert(date, "America/New_York", "Etc/UTC"), "yyyyMMddTHHmmssZ") + ";";

        ok(isException(exception, date, "America/New_York"));
    });
})();