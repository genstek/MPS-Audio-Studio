# LAS-38 manual QA for Gennady

Prepared for after the gate; actual results stay **Not Run** until you test.

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-38-QA-01 | With the bridge running and a permitted test plugin installed: pair the studio, choose the plugin, set a parameter, render a known fixture, save the project, reload it. | A measurable change from the plugin; the parameter and state come back after reload; bypass gives the unprocessed render. | Not Run | NOT_RUN |
| LAS-38-QA-02 | Remove the plugin, use a wrong token, or force the stand-in crash plugin, then render. | A clear error each time; your source and project are unchanged; rendering without the plugin still works. | Not Run | NOT_RUN |
