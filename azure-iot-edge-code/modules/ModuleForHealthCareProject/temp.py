import csv

start = 0
end = 150
with open('data.csv') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    line_count = 0
    for row in csv_reader:
        if line_count < start:
            line_count+=1
            continue
        elif line_count >= end:
            line_count+=1
            break
        else:
            print(row)
            line_count+=1